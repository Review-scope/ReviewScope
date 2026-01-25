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
import { db, configs } from '../../../api/src/db/index.js';
import { eq } from 'drizzle-orm';
import { decrypt } from '@reviewscope/security';

// Instantiate dependencies once if possible, or per job if config varies
// For now, we assume global config from env
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const GEMINI_API_KEY = process.env.GOOGLE_API_KEY || '';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-dev-key-change-me-12345';

console.warn(`[LLM] Encryption Key Status: ${process.env.ENCRYPTION_KEY ? 'LOADED' : 'MISSING (Using Fallback)'}`);

// Factory to get provider based on config (could be dynamic per repo later)
export async function createConfiguredProvider(installationId?: string): Promise<{ provider: LLMProvider, smartRouting: boolean }> {
  let smartRouting = false;

  // 1. Try to fetch user-provided config from DB
  if (installationId) {
    console.warn(`[LLM] Fetching config for installation: ${installationId}`);
    const [userConfig] = await db.select().from(configs).where(eq(configs.installationId, installationId));
    
    if (userConfig) {
      smartRouting = userConfig.smartRouting;

      if (userConfig.apiKeyEncrypted) {
        try {
          const decryptedKey = decrypt(userConfig.apiKeyEncrypted, ENCRYPTION_KEY);
          console.warn(`[LLM] Using CUSTOM ${userConfig.provider} key for installation ${installationId} (Prefix: ${decryptedKey.substring(0, 6)}...)`);
          return {
            provider: createProvider(userConfig.provider as 'openai' | 'gemini', decryptedKey),
            smartRouting
          };
        } catch (e: unknown) {
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          console.error(`[LLM] Failed to decrypt user API key for installation ${installationId}. Error: ${(e as any).message}`);
        }
      } else {
        console.warn(`[LLM] No custom API key found in DB for installation ${installationId}`);
      }
    }
  } else {
    console.warn(`[LLM] No installationId provided to createConfiguredProvider`);
  }

  // 2. Fallback to server defaults
  if (GEMINI_API_KEY) {
    console.warn(`[LLM] Falling back to SERVER DEFAULT gemini key (Prefix: ${GEMINI_API_KEY.substring(0, 6)}...)`);
    return { provider: createProvider('gemini', GEMINI_API_KEY), smartRouting };
  }
  if (OPENAI_API_KEY) {
    console.warn(`[LLM] Falling back to SERVER DEFAULT openai key (Prefix: ${OPENAI_API_KEY.substring(0, 6)}...)`);
    return { provider: createProvider('openai', OPENAI_API_KEY), smartRouting };
  }
  throw new Error('No valid LLM API key found (OPENAI_API_KEY or GOOGLE_API_KEY)');
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
  
  // Determine model based on complexity
  let modelName = options.model || 'gemini-2.5-flash';
  
  // LOGIC: Use intelligent routing ONLY if smartRouting is enabled (explicit user opt-in)
  // OR if no model is specified at all (fallback to smart defaults).
  if (input.complexity && (smartRouting || !options.model)) {
    const hasGemini = !!(GEMINI_API_KEY || (options.model?.includes('gemini')));
    const hasOpenAI = !!(OPENAI_API_KEY || (options.model?.includes('gpt')));
    
    const route = selectModel({ hasGemini, hasOpenAI }, input.complexity);
    if (route.model !== 'none') {
      modelName = route.model;
      console.warn(`[Model Routing] Complexity: ${input.complexity} → ${route.model} (${route.reason})`);
    }
  }
  
  // 1. Assemble Context
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
    userPrompt: options.userGuidelines, // Pass user guidelines as userPrompt
    ruleViolations: input.ruleViolations, // Static rules for LLM validation
  }, modelName, input.complexity);

  console.warn(`Context assembled: ${assembled.usedTokens} tokens (Budget: ${assembled.budgetTokens})`);

  // 2. Build Prompt
  const messages = [
    { role: 'system' as const, content: REVIEW_SYSTEM_PROMPT },
    { role: 'user' as const, content: assembled.content }
  ];

  // 3. Call LLM
  console.warn(`Calling LLM (${provider.name} - ${modelName})...`);
  const response = await provider.chat(messages, {
    model: modelName,
    temperature: 0.2, // Low temp for code review precision
    responseFormat: 'json',
  });

  // 4. Parse Response
  const result = parseReviewResponse(response.content);
  console.warn(`LLM returned ${result.comments.length} comments. Summary: ${result.summary}`);

  // 5. Calculate Confidence Score
  let confidence: 'high' | 'medium' | 'low' = 'high';
  
  // Lower confidence if PR is complex but using a smaller model
  if (input.complexity === 'complex' && modelName.includes('flash')) {
    confidence = 'medium';
  }

  // Lower confidence if no extra context (RAG or Related) was provided for non-trivial PRs
  const hasExtraContext = (input.ragContext && input.ragContext.length > 0) || 
                          (input.relatedContext && input.relatedContext.length > 0);

  if (!hasExtraContext && input.complexity !== 'trivial') {
    // Slight penalty if we have no context for non-trivial PRs
    confidence = confidence === 'high' ? 'medium' : 'low'; 
  }

  return {
    comments: result.comments,
    contextHash: assembled.contextHash,
    summary: result.summary,
    assessment: {
        ...result.assessment,
        confidence
    },
  };
}
