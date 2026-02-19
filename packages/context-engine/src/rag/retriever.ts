import { getQdrantClient, COLLECTION_NAME } from './client.js';
import type { EmbeddingProvider } from '@reviewscope/llm-core';

export interface RetrievedContext {
  file: string;
  content: string;
  score: number;
}

export interface RAGRetrieverOptions {
  embeddingModel?: string;
}

export class RAGRetriever {
  private embeddingModel: string;

  constructor(private embedder: EmbeddingProvider, options: RAGRetrieverOptions = {}) {
    this.embeddingModel = options.embeddingModel || embedder.defaultModel;
  }

  async retrieve(repoId: string, query: string, limit: number = 5): Promise<RetrievedContext[]> {
    const client = getQdrantClient();
    
    // Check if collection exists first to avoid errors
    const exists = await client.collectionExists(COLLECTION_NAME);
    if (!exists.exists) return [];

    // Embed query
    const [vector] = await this.embedder.embedBatch([query], { 
      model: this.embeddingModel,
      dimensions: this.embedder.defaultSize
    });

    // Search
    const results = await client.search(COLLECTION_NAME, {
      vector,
      filter: {
        must: [
          {
            key: 'repoId',
            match: { value: repoId },
          },
        ],
      },
      limit,
    });

    return results.map((match) => ({
      file: match.payload?.file as string,
      content: match.payload?.content as string,
      score: match.score,
    }));
  }
}
