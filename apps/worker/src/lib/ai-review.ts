import {
  ContextAssembler,
  systemGuardrailsLayer,
  repoMetadataLayer,
  issueIntentLayer,
  relatedFilesLayer,
  ragContextLayer,
  prDiffLayer,
  userPromptLayer,
  webContextLayer
} from '@reviewscope/context-engine';
import { createProvider, parseReviewResponse, type ReviewComment, type LLMProvider, REVIEW_SYSTEM_PROMPT } from '@reviewscope/llm-core';
import { selectModel } from '@reviewscope/llm-core';
import { db, configs, installations } from '../../../api/src/db/index.js';
import { eq } from 'drizzle-orm';
import { decrypt } from '@reviewscope/security';
import { getTier, PlanTier } from './plans.js';

const SARVAM_API_KEY = process.env.SARVAM_API_KEY || '';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-dev-key-change-me-12345';

console.warn(`[LLM] Encryption Key Status: ${process.env.ENCRYPTION_KEY ? 'LOADED' : 'MISSING (Using Fallback)'}`);

export async function createConfiguredProvider(installationId?: string): Promise<{ provider: LLMProvider, smartRouting: boolean }> {
  if (installationId) {
    console.warn(`[LLM] Fetching config for installation: ${installationId}`);

    const [installation] = await db.select().from(installations).where(eq(installations.id, installationId));
    const [userConfig] = await db.select().from(configs).where(eq(configs.installationId, installationId));
    const tier = getTier(installation?.planId ?? null);

    if (userConfig?.apiKeyEncrypted) {
      if (tier === PlanTier.PRO && userConfig.provider === 'sarvam') {
        throw new Error('Sarvam is not available on Pro plan. Use Gemini or OpenAI.');
      }

      try {
        const decryptedKey = decrypt(userConfig.apiKeyEncrypted, ENCRYPTION_KEY);
        console.warn(`[LLM] Using CUSTOM ${userConfig.provider} key for installation ${installationId} (Prefix: ${decryptedKey.substring(0, 6)}...)`);
        return {
          provider: createProvider(userConfig.provider as 'openai' | 'gemini' | 'sarvam', decryptedKey),
          smartRouting: userConfig.smartRouting,
        };
      } catch (e: unknown) {
        console.error(`[LLM] Failed to decrypt user API key for installation ${installationId}. Error: ${(e as Error).message}`);
        throw new Error('Failed to decrypt configured API key');
      }
    }

    if (tier === PlanTier.PRO) {
      throw new Error('Pro plan requires a user API key. Configure Gemini or OpenAI in settings.');
    }

    if (!SARVAM_API_KEY) {
      throw new Error('SARVAM_API_KEY is required for Free plan fallback reviews');
    }
    return { provider: createProvider('sarvam', SARVAM_API_KEY), smartRouting: false };
  }

  console.warn('[LLM] No installationId provided to createConfiguredProvider');
  if (!SARVAM_API_KEY) {
    throw new Error('SARVAM_API_KEY is required');
  }
  return { provider: createProvider('sarvam', SARVAM_API_KEY), smartRouting: false };
}

interface AIReviewInput {
  installationId?: string; // Database UUID of installation
  repositoryFullName: string;
  prNumber: number;
  prTitle: string;
  prBody: string;
  diff: string;
  issueContext?: string;
  relatedContext?: string; // Deterministic context from imports
  ragContext?: string; // Pre-fetched RAG context if any
  ruleViolations?: unknown[]; // Static rule violations for LLM validation
  complexity?: 'trivial' | 'simple' | 'complex'; // Complexity tier for model routing
}

export interface AIReviewResult {
  comments: ReviewComment[];
  contextHash: string;
  summary: string;
  riskAnalysis?: string;
  assessment: {
    riskLevel: string;
    mergeReadiness: string;
    confidence: 'high' | 'medium' | 'low';
  };
}

export interface AIReviewOptions {
  model?: string;
  temperature?: number;
  userGuidelines?: string;
}

export async function runAIReview(input: AIReviewInput, options: AIReviewOptions = {}): Promise<AIReviewResult> {
  const { provider, smartRouting } = await createConfiguredProvider(input.installationId);

  let modelName =
    options.model ||
    (provider.name === 'sarvam'
      ? 'sarvam-m'
      : provider.name === 'openai'
        ? 'gpt-4o'
        : 'gemini-2.5-flash');

  if (input.complexity && provider.name !== 'sarvam' && (smartRouting || !options.model)) {
    const route = selectModel(
      {
        hasGemini: provider.name === 'gemini',
        hasOpenAI: provider.name === 'openai',
      },
      input.complexity
    );

    if (route.model !== 'none') {
      modelName = route.model;
      console.warn(`[Model Routing] Complexity: ${input.complexity} -> ${route.model} (${route.reason})`);
    }
  }

  const assembler = new ContextAssembler();
  assembler.addLayer(systemGuardrailsLayer);
  assembler.addLayer(repoMetadataLayer);
  assembler.addLayer(issueIntentLayer);
  assembler.addLayer(relatedFilesLayer);
  assembler.addLayer(ragContextLayer);
  assembler.addLayer(webContextLayer);
  assembler.addLayer(prDiffLayer);
  assembler.addLayer(userPromptLayer);

  const assembled = await assembler.assemble({
    repositoryFullName: input.repositoryFullName,
    prNumber: input.prNumber,
    prTitle: input.prTitle,
    prBody: input.prBody,
    diff: input.diff,
    issueContext: input.issueContext,
    relatedContext: input.relatedContext,
    ragContext: input.ragContext,
    userPrompt: options.userGuidelines,
    ruleViolations: input.ruleViolations,
  }, modelName, input.complexity);

  console.warn(`Context assembled: ${assembled.usedTokens} tokens (Budget: ${assembled.budgetTokens})`);

  const messages = [
    {
      role: 'system' as const,
      content: REVIEW_SYSTEM_PROMPT
    },
    { role: 'user' as const, content: assembled.content }
  ];

  console.warn(`Calling LLM (${provider.name} - ${modelName})...`);
  const response = await provider.chat(messages, {
    model: modelName,
    temperature: 0.2,
    responseFormat: 'json',
  });

  const result = parseReviewResponse(response.content);
  console.warn(`LLM returned ${result.comments.length} comments. Summary: ${result.summary}`);

  let confidence: 'high' | 'medium' | 'low' = 'high';

  if (input.complexity === 'complex' && modelName.includes('flash')) {
    confidence = 'medium';
  }

  const hasExtraContext = (input.ragContext && input.ragContext.length > 0) ||
                          (input.relatedContext && input.relatedContext.length > 0);

  if (!hasExtraContext && input.complexity !== 'trivial') {
    confidence = confidence === 'high' ? 'medium' : 'low';
  }

  return {
    comments: result.comments,
    contextHash: assembled.contextHash,
    summary: result.summary,
    riskAnalysis: result.riskAnalysis,
    assessment: {
      ...result.assessment,
      confidence
    },
  };
}
