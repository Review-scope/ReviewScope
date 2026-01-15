// Types
export * from './types.js';

// Model budgets and selection
export { MODEL_CONTEXT_BUDGET, getContextBudget, isModelSupported } from './modelBudgets.js';
export { selectModel, getContextBudgetForModel, estimateCost, compareCosts, type ModelRoute } from './selectModel.js';
export type { Complexity } from './selectModel.js';

// Prompts (shared across all providers)
export {
  REVIEW_SYSTEM_PROMPT,
  CHAT_SYSTEM_PROMPT,
  buildReviewPrompt,
  parseReviewResponse,
  prioritizeComments,
  DEFAULT_MAX_COMMENTS,
  type ReviewComment,
  type ReviewResult,
} from './prompts.js';

// Providers
export { OpenAIProvider } from './providers/openai.js';
export { GeminiProvider } from './providers/gemini.js';

// Provider factory
import type { LLMProvider } from './types.js';
import { OpenAIProvider } from './providers/openai.js';
import { GeminiProvider } from './providers/gemini.js';

export type ProviderName = 'openai' | 'gemini';

export function createProvider(name: ProviderName, apiKey: string): LLMProvider {
  switch (name) {
    case 'openai':
      return new OpenAIProvider(apiKey);
    case 'gemini':
      return new GeminiProvider(apiKey);
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}
