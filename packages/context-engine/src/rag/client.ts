import { QdrantClient } from '@qdrant/js-client-rest';

export const COLLECTION_NAME = 'reviewscope_repos';

let qdrantInstance: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (!qdrantInstance) {
    const url = process.env.QDRANT_URL;
    const apiKey = process.env.QDRANT_API_KEY;

    if (!url || !apiKey) {
      throw new Error('QDRANT_URL or QDRANT_API_KEY not defined');
    }

    qdrantInstance = new QdrantClient({ url, apiKey });
  }
  return qdrantInstance;
}
