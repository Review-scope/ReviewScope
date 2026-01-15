/**
 * Model Context Budgets
 * Prevents silent truncation
 */
export const MODEL_CONTEXT_BUDGET: Record<string, number> = {
  // Gemini models
  'gemini-2.5-flash': 16000,
  'gemini-3-flash': 32000,
  'gemini-3-pro': 100000,

  // OpenAI models
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-4-turbo': 128000,
  'gpt-3.5-turbo': 16000,
};

export function getContextBudget(model: string): number {
  const budget = MODEL_CONTEXT_BUDGET[model];
  if (!budget) {
    // Default conservative budget for unknown models
    return 8000;
  }
  return budget;
}

export function isModelSupported(model: string): boolean {
  return model in MODEL_CONTEXT_BUDGET;
}
