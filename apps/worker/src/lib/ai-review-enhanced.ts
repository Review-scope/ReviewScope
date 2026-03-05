import {
  ContextAssembler,
  systemGuardrailsLayer,
  repoMetadataLayer,
  issueIntentLayer,
  relatedFilesLayer,
  ragContextLayer,
  prDiffLayer,
  userPromptLayer,
  webContextLayer,
  complexityAssessmentLayer,
  ruleViolationsLayer
} from '@reviewscope/context-engine';
import {
  createProvider,
  parseReviewResponse,
  type ReviewComment,
  type LLMProvider,
  REVIEW_SYSTEM_PROMPT,
  PR_SUMMARY_SYSTEM_PROMPT,
  parsePRSummaryResponse,
  type PRSummaryResult,
  selectModel,
  buildPRSummaryPrompt,
  LLMRateLimitError,
  type ChatOptions,
  type ChatResponse,
  type RuleValidation,
  type Message
} from '@reviewscope/llm-core';
import { db, configs, installations } from '../../../api/src/db/index.js';
import { eq } from 'drizzle-orm';
import { decrypt } from '@reviewscope/security';
import { ComplexityScore } from './complexity.js';
import { getTier, PlanTier } from './plans.js';

const SARVAM_API_KEY = process.env.SARVAM_API_KEY || '';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-dev-key-change-me-12345';

console.warn(`[Enhanced LLM] Encryption Key Status: ${process.env.ENCRYPTION_KEY ? 'LOADED' : 'MISSING (Using Fallback)'}`);

export async function createConfiguredProvider(installationId?: string): Promise<{ provider: LLMProvider, smartRouting: boolean }> {
  // ... existing implementation remains same ...
  if (installationId) {
    console.warn(`[Enhanced LLM] Fetching config for installation: ${installationId}`);

    const [installation] = await db.select().from(installations).where(eq(installations.id, installationId));
    const [userConfig] = await db.select().from(configs).where(eq(configs.installationId, installationId));
    const tier = getTier(installation?.planId ?? null);

    if (userConfig?.provider === 'sarvam') {
      if (tier === PlanTier.PRO) {
        throw new Error('Sarvam is not available on Pro plan. Use Gemini or OpenAI.');
      }
      if (!SARVAM_API_KEY) {
        throw new Error('SARVAM_API_KEY is required for Free plan fallback reviews');
      }

      console.warn(`[Enhanced LLM] Using server-managed Sarvam key for installation ${installationId}`);
      return { provider: createProvider('sarvam', SARVAM_API_KEY), smartRouting: false };
    }

    if (userConfig?.apiKeyEncrypted) {
      try {
        const decryptedKey = decrypt(userConfig.apiKeyEncrypted, ENCRYPTION_KEY);
        console.warn(`[Enhanced LLM] Using CUSTOM ${userConfig.provider} key for installation ${installationId}`);
        return {
          provider: createProvider(userConfig.provider as 'openai' | 'gemini' | 'sarvam', decryptedKey),
          smartRouting: userConfig.smartRouting,
        };
      } catch {
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

  if (!SARVAM_API_KEY) {
    throw new Error('SARVAM_API_KEY is required');
  }
  return { provider: createProvider('sarvam', SARVAM_API_KEY), smartRouting: false };
}

interface AIReviewInput {
  installationId?: string;
  repositoryFullName: string;
  prNumber: number;
  prTitle: string;
  prBody: string;
  author: string;
  diff: string;
  issueContext?: string;
  relatedContext?: string;
  ragContext?: string;
  ruleViolations?: unknown[];
  complexity?: ComplexityScore;
}

export interface AIReviewResult {
  comments: ReviewComment[];
  contextHash: string;
  summary: string;
  prSummary?: PRSummaryResult;
  riskAnalysis?: string;
  assessment: {
    riskLevel: string;
    mergeReadiness: string;
    confidence: 'high' | 'medium' | 'low';
  };
  ruleValidations?: RuleValidation[];
}

export interface AIReviewOptions {
  model?: string;
  temperature?: number;
  userGuidelines?: string;
  generateDetailedSummary?: boolean;
}

/**
 * Helper to run chat with an immediate model fallback if rate limited
 */
async function runWithModelFallback(
  provider: LLMProvider,
  messages: Message[],
  options: ChatOptions,
  fallbackModel?: string
): Promise<ChatResponse> {
  try {
    return await provider.chat(messages, options);
  } catch (error) {
    if (error instanceof LLMRateLimitError && fallbackModel) {
      console.warn(`[Enhanced LLM] Rate limit hit for ${options.model}. Immediately falling back to ${fallbackModel}...`);
      return await provider.chat(messages, { ...options, model: fallbackModel });
    }
    throw error;
  }
}

async function generatePRSummary(
  input: AIReviewInput,
  provider: LLMProvider,
  modelName: string,
  fallbackModel?: string
): Promise<PRSummaryResult> {
  console.warn('[Enhanced LLM] Generating detailed PR summary...');

  const summaryPrompt = buildPRSummaryPrompt({
    prTitle: input.prTitle,
    prBody: input.prBody,
    author: input.author,
    diff: input.diff,
    issueContext: input.issueContext,
  });

  const messages = [
    { role: 'system' as const, content: PR_SUMMARY_SYSTEM_PROMPT },
    { role: 'user' as const, content: summaryPrompt }
  ];

  const response = await runWithModelFallback(provider, messages, {
    model: modelName,
    temperature: 0.3,
    responseFormat: 'json',
  }, fallbackModel);

  return parsePRSummaryResponse(response.content);
}

export async function generateGlobalSummary(
  input: {
    prTitle: string;
    prBody: string;
    author: string;
    batchSummaries: string[];
    installationId?: string;
  }
): Promise<PRSummaryResult> {
  const { provider } = await createConfiguredProvider(input.installationId);
  const modelName = provider.name === 'sarvam' ? 'sarvam-m' : provider.name === 'openai' ? 'gpt-4o' : 'gemini-2.5-flash';

  console.warn('[Enhanced LLM] Generating global PR summary from batch findings...');

  const summaryPrompt = `PR Title: ${input.prTitle}\nPR Body: ${input.prBody}\nAuthor: ${input.author}\n\nBelow are summaries from different parts of the PR review. Please synthesize them into one cohesive PR summary.\n\n${input.batchSummaries.map((s, i) => `Batch ${i + 1}:\n${s}`).join('\n\n')}`;

  const messages = [
    { role: 'system' as const, content: PR_SUMMARY_SYSTEM_PROMPT },
    { role: 'user' as const, content: summaryPrompt }
  ];

  const response = await provider.chat(messages, {
    model: modelName,
    temperature: 0.3,
    responseFormat: 'json',
  });

  return parsePRSummaryResponse(response.content);
}

export async function runEnhancedAIReview(
  input: AIReviewInput,
  options: AIReviewOptions = {}
): Promise<AIReviewResult> {
  const { provider, smartRouting } = await createConfiguredProvider(input.installationId);

  let modelName =
    options.model ||
    (provider.name === 'sarvam'
      ? 'sarvam-m'
      : provider.name === 'openai'
        ? 'gpt-4o'
        : 'gemini-2.5-flash');
  let fallbackModel: string | undefined;
  
  const complexityTier = input.complexity?.tier;

  if (complexityTier && provider.name !== 'sarvam' && (smartRouting || !options.model)) {
    const route = selectModel({
      hasGemini: provider.name === 'gemini',
      hasOpenAI: provider.name === 'openai'
    }, complexityTier);

    if (route.model !== 'none') {
      modelName = route.model;
      fallbackModel = route.fallbackModel;
      console.warn(`[Enhanced Model Routing] Complexity: ${complexityTier} -> ${route.model} (Fallback: ${fallbackModel || 'none'}) (${route.reason})`);
    }
  }

  let prSummary: PRSummaryResult | undefined;

  if (options.generateDetailedSummary) {
    try {
      prSummary = await generatePRSummary(input, provider, modelName, fallbackModel);
      console.warn('[Enhanced LLM] Generated detailed PR summary');
    } catch (error) {
      if (error instanceof LLMRateLimitError) throw error; // Re-throw to trigger job-level retry
      console.error('[Enhanced LLM] Failed to generate PR summary:', error);
    }
  }

  const assembler = new ContextAssembler();
  assembler.addLayer(systemGuardrailsLayer);
  assembler.addLayer(repoMetadataLayer);
  assembler.addLayer(complexityAssessmentLayer);
  assembler.addLayer(issueIntentLayer);
  assembler.addLayer(ruleViolationsLayer);
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
    complexity: input.complexity,
  }, modelName, complexityTier);

  console.warn(`[Enhanced LLM] Context assembled: ${assembled.usedTokens} tokens (Budget: ${assembled.budgetTokens})`);

  const messages = [
    { role: 'system' as const, content: REVIEW_SYSTEM_PROMPT },
    { role: 'user' as const, content: assembled.content }
  ];

  const response = await runWithModelFallback(provider, messages, {
    model: modelName,
    temperature: 0.2,
    responseFormat: 'json',
  }, fallbackModel);

  const result = parseReviewResponse(response.content);
  console.warn(`[Enhanced LLM] Generated ${result.comments.length} review comments`);

  let confidence: 'high' | 'medium' | 'low' = 'high';

  if (complexityTier === 'complex' && (modelName.includes('flash') || (fallbackModel && fallbackModel.includes('flash')))) {
    confidence = 'medium';
  }

  const hasExtraContext = (input.ragContext && input.ragContext.length > 0) ||
                          (input.relatedContext && input.relatedContext.length > 0);

  if (!hasExtraContext && complexityTier !== 'trivial') {
    confidence = confidence === 'high' ? 'medium' : 'low';
  }

  return {
    comments: result.comments,
    contextHash: assembled.contextHash,
    summary: result.summary,
    prSummary,
    riskAnalysis: result.riskAnalysis,
    assessment: {
      ...result.assessment,
      confidence
    },
    ruleValidations: result.ruleValidations,
  };
}

