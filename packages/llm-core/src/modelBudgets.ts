/**
 * Model Context Budgets
 * Prevents silent truncation
 */
export const MODEL_CONTEXT_BUDGET: Record<string, number> = {
  // Gemini models (Free tier preferred)
  'gemini-2.5-flash-lite': 1000000,
  'gemini-2.5-flash': 1000000,
  'gemini-3-flash': 1000000,

  // OpenAI models
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-4-turbo': 128000,
  'gpt-3.5-turbo': 16000,
  
  // Future/Hypothetical OpenAI models (from existing code)
  'gpt-5-nano-2025-08-07': 128000,
  'gpt-5-mini-2025-08-07': 128000,
  'gpt-5.2-2025-12-11': 128000,
};

export function getContextBudget(model: string): number {
  const budget = MODEL_CONTEXT_BUDGET[model];
  if (!budget) {
    // Default conservative budget for unknown models
    return 32000;
  }
  return budget;
}

export function isModelSupported(model: string): boolean {
  return model in MODEL_CONTEXT_BUDGET;
}
