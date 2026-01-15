import type { ContextLayer, ContextInput } from '../layers.js';

export const ragContextLayer: ContextLayer = {
  name: 'rag-context',
  async getContext(input: ContextInput): Promise<string> {
    if (!input.indexedAt || !input.ragContext) return '';
    
    return `RAG Context (Retrieved Symbols):
${input.ragContext}
`;
  },
};
