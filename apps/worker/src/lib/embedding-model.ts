import type { LLMProvider } from '@reviewscope/llm-core';

export function resolveEmbeddingModel(provider: LLMProvider): string {
  if (provider.name === 'gemini') return 'gemini-embedding-001';
  if (provider.name === 'openai') return 'text-embedding-3-small';
  throw new Error(`Provider ${provider.name} does not support embeddings`);
}

