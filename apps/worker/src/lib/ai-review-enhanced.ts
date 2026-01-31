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
  buildReviewPrompt,
  buildPRSummaryPrompt
} from '@reviewscope/llm-core';
import { db, configs } from '../../../api/src/db/index.js';
import { eq } from 'drizzle-orm';
import { decrypt } from '@reviewscope/security';

// Instantiate dependencies once if possible, or per job if config varies
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const GEMINI_API_KEY = process.env.GOOGLE_API_KEY || '';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-dev-key-change-me-12345';

console.warn(`[Enhanced LLM] Encryption Key Status: ${process.env.ENCRYPTION_KEY ? 'LOADED' : 'MISSING (Using Fallback)'}`);

// Factory to get provider based on config
export async function createConfiguredProvider(installationId?: string): Promise<{ provider: LLMProvider, smartRouting: boolean }> {
  let smartRouting = false;

  // 1. Try to fetch user-provided config from DB
  if (installationId) {
    console.warn(`[Enhanced LLM] Fetching config for installation: ${installationId}`);
    const [userConfig] = await db.select().from(configs).where(eq(configs.installationId, installationId));
    
    if (userConfig) {
      smartRouting = userConfig.smartRouting;

      if (userConfig.apiKeyEncrypted) {
        try {
          const decryptedKey = decrypt(userConfig.apiKeyEncrypted, ENCRYPTION_KEY);
          console.warn(`[Enhanced LLM] Using CUSTOM ${userConfig.provider} key for installation ${installationId}`);
          return {
            provider: createProvider(userConfig.provider as 'openai' | 'gemini', decryptedKey),
            smartRouting
          };
        } catch (e: unknown) {
          console.error(`[Enhanced LLM] Failed to decrypt user API key for installation ${installationId}`);
        }
      }
    }
  }

  // 2. Fallback to server defaults
  if (GEMINI_API_KEY) {
    console.warn(`[Enhanced LLM] Falling back to SERVER DEFAULT gemini key`);
    return { provider: createProvider('gemini', GEMINI_API_KEY), smartRouting };
  }
  if (OPENAI_API_KEY) {
    console.warn(`[Enhanced LLM] Falling back to SERVER DEFAULT openai key`);
    return { provider: createProvider('openai', OPENAI_API_KEY), smartRouting };
  }
  throw new Error('No valid LLM API key found');
}

interface AIReviewInput {
  installationId?: string;
  repositoryFullName: string;
  prNumber: number;
  prTitle: string;
  prBody: string;
  diff: string;
  issueContext?: string;
  relatedContext?: string;
  ragContext?: string;
  ruleViolations?: unknown[];
  complexity?: 'trivial' | 'simple' | 'complex';
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
}

export interface AIReviewOptions {
  model?: string;
  temperature?: number;
  userGuidelines?: string;
  generateDetailedSummary?: boolean; // New option to enable detailed PR summary
}

/**
 * Generate detailed PR summary using separate API call
 */
async function generatePRSummary(
  input: AIReviewInput,
  provider: LLMProvider,
  modelName: string
): Promise<PRSummaryResult> {
  console.warn(`[Enhanced LLM] Generating detailed PR summary...`);
  
  // Build summary-specific context (lighter weight)


  // Build summary prompt
  const summaryPrompt = buildPRSummaryPrompt({
    prTitle: input.prTitle,
    prBody: input.prBody,
    diff: input.diff,
    issueContext: input.issueContext,
  });

  // Call LLM for summary
  const messages = [
    { role: 'system' as const, content: PR_SUMMARY_SYSTEM_PROMPT },
    { role: 'user' as const, content: summaryPrompt }
  ];

  const response = await provider.chat(messages, {
    model: modelName,
    temperature: 0.3, // Slightly higher temp for more conversational tone
    responseFormat: 'json',
  });

  return parsePRSummaryResponse(response.content);
}

/**
 * Enhanced AI review with separate PR summary generation
 */
export async function runEnhancedAIReview(
  input: AIReviewInput,
  options: AIReviewOptions = {}
): Promise<AIReviewResult> {
  const { provider, smartRouting } = await createConfiguredProvider(input.installationId);
  
  // Determine model based on complexity
  let modelName = options.model || 'gemini-2.5-flash';
  
  if (input.complexity && (smartRouting || !options.model)) {
    const hasGemini = !!(GEMINI_API_KEY || (options.model?.includes('gemini')));
    const hasOpenAI = !!(OPENAI_API_KEY || (options.model?.includes('gpt')));
    
    const route = selectModel({ hasGemini, hasOpenAI }, input.complexity);
    if (route.model !== 'none') {
      modelName = route.model;
      console.warn(`[Enhanced Model Routing] Complexity: ${input.complexity} → ${route.model} (${route.reason})`);
    }
  }
  
  let prSummary: PRSummaryResult | undefined;
  
  // Generate detailed PR summary if requested
  if (options.generateDetailedSummary) {
    try {
      prSummary = await generatePRSummary(input, provider, modelName);
      console.warn(`[Enhanced LLM] Generated detailed PR summary`);
    } catch (error) {
      console.error(`[Enhanced LLM] Failed to generate PR summary:`, error);
      // Continue with review even if summary generation fails
    }
  }
  
  // Build full context for code review
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

  console.warn(`[Enhanced LLM] Context assembled: ${assembled.usedTokens} tokens (Budget: ${assembled.budgetTokens})`);

  // Build review prompt
  const reviewPrompt = buildReviewPrompt({
    prTitle: input.prTitle,
    prBody: input.prBody,
    diff: input.diff,
    issueContext: input.issueContext,
    userGuidelines: options.userGuidelines,
    ruleViolations: input.ruleViolations as any,
    complexity: input.complexity as any,
  });

  // Call LLM for code review
  const messages = [
    { role: 'system' as const, content: REVIEW_SYSTEM_PROMPT },
    { role: 'user' as const, content: reviewPrompt }
  ];

  const response = await provider.chat(messages, {
    model: modelName,
    temperature: 0.2,
    responseFormat: 'json',
  });

  const result = parseReviewResponse(response.content);
  console.warn(`[Enhanced LLM] Generated ${result.comments.length} review comments`);

  // Calculate confidence score
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
    prSummary,
    riskAnalysis: result.riskAnalysis,
    assessment: {
        ...result.assessment,
        confidence
    },
  };
}