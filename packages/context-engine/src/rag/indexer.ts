import { v4 as uuidv4 } from 'uuid';
import { getQdrantClient, COLLECTION_NAME } from './client.js';
import { chunkFile, type DiffChunk } from './chunker.js';
import type { EmbeddingProvider } from '@reviewscope/llm-core';

export interface RAGIndexerOptions {
  vectorSize?: number;
  embeddingModel?: string;
}

export class RAGIndexer {
  private vectorSize: number;
  private embeddingModel: string;

  constructor(private embedder: EmbeddingProvider, options: RAGIndexerOptions = {}) {
    this.vectorSize = options.vectorSize || embedder.defaultSize;
    this.embeddingModel = options.embeddingModel || embedder.defaultModel;
  }

  async ensureCollection() {
    const client = getQdrantClient();
    const exists = await client.collectionExists(COLLECTION_NAME);
    if (!exists.exists) {
      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: this.vectorSize,
          distance: 'Cosine',
        },
      });
      console.warn(`[Qdrant] Created collection ${COLLECTION_NAME}`);
    }

    try {
      await client.createPayloadIndex(COLLECTION_NAME, {
        field_name: 'repoId',
        field_schema: 'keyword',
        wait: true,
      });
      await client.createPayloadIndex(COLLECTION_NAME, {
        field_name: 'installationId',
        field_schema: 'keyword',
        wait: true,
      });
    } catch (e) {
      // Ignore if already exists
    }
  }

  async indexRepository(repoId: string, installationId: string, files: { path: string, content: string }[]) {
    await this.ensureCollection();
    const client = getQdrantClient();
    const batchId = uuidv4();

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const points: any[] = [];

    // 1. Chunk files
    const allChunks: DiffChunk[] = [];
    for (const file of files) {
      if (!file.content) {
        console.warn(`[Indexer] Skipping empty file: ${file.path}`);
        continue;
      }
      const chunks = chunkFile(file.path, file.content);
      allChunks.push(...chunks);
    }

    // 2. Generate embeddings
    // Batch in groups of 100 to respect API limits
    const BATCH_SIZE = 50;
    for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
      const batch = allChunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map(c => `File: ${c.file}\nContent:\n${c.content}`);
      
      const embeddings = await this.embedder.embedBatch(texts, { 
        model: this.embeddingModel,
        dimensions: this.vectorSize
      });

      batch.forEach((chunk, idx) => {
        points.push({
          id: uuidv4(),
          vector: embeddings[idx],
          payload: {
            repoId,
            installationId,
            batchId,
            file: chunk.file,
            chunkId: chunk.chunkId,
            content: chunk.content,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
          },
        });
      });
    }

    // 3. Upsert to Qdrant
    if (points.length > 0) {
      await client.upsert(COLLECTION_NAME, {
        wait: true,
        points,
      });

      try {
        await client.delete(COLLECTION_NAME, {
          filter: {
            must: [
              { key: 'repoId', match: { value: repoId } },
            ],
            must_not: [
              { key: 'batchId', match: { value: batchId } },
            ],
          },
        });
      } catch (e) {
        console.warn(`[Indexer] Failed to clear old vectors for repo ${repoId}:`, e);
      }
    }

    return points.length;
  }
}
