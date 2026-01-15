import { getQdrantClient, COLLECTION_NAME } from './client.js';
import type { EmbeddingProvider } from '@reviewscope/llm-core';

export interface RetrievedContext {
  file: string;
  content: string;
  score: number;
}

export class RAGRetriever {
  constructor(private embedder: EmbeddingProvider
  ) {}

  async retrieve(repoId: string, query: string, limit: number = 5): Promise<RetrievedContext[]> {
    const client = getQdrantClient();
    
    // Check if collection exists first to avoid errors
    const exists = await client.collectionExists(COLLECTION_NAME);
    if (!exists.exists) return [];

    // Embed query
    const [vector] = await this.embedder.embedBatch([query], { model: 'text-embedding-004' });

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
