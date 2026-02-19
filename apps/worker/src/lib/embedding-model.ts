import type { LLMProvider } from '@reviewscope/llm-core';

export function shouldSkipEmbeddings(providerName: string, selectedModel?: string | null): boolean {
  if (providerName === 'sarvam') return true;
  return (selectedModel || '').toLowerCase().startsWith('sarvam');
}

export function resolveEmbeddingModel(provider: LLMProvider): string {
  if (provider.name === 'gemini') return 'gemini-embedding-001';
  if (provider.name === 'openai') return 'text-embedding-3-small';
  throw new Error(`Provider ${provider.name} does not support embeddings`);
}
