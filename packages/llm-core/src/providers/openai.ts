import OpenAI from 'openai';
import { encodingForModel, type TiktokenModel } from 'js-tiktoken';
import type { LLMProvider, Message, ChatOptions, ChatResponse, EmbeddingProvider, EmbeddingOptions } from '../types.js';

export class OpenAIProvider implements LLMProvider, EmbeddingProvider {
  name = 'openai';
  supportsStreaming = false as const;
  
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async chat(messages: Message[], options: ChatOptions): Promise<ChatResponse> {
    const response = await this.client.chat.completions.create({
      model: options.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens,
      stream: false, // Explicitly disabled
    });

    const choice = response.choices[0];
    
    return {
      content: choice?.message?.content || '',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }

  async embed(text: string, options: EmbeddingOptions): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: options.model,
      input: text,
      dimensions: options.dimensions,
    });
    return response.data[0].embedding;
  }

  async embedBatch(texts: string[], options: EmbeddingOptions): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: options.model,
      input: texts,
      dimensions: options.dimensions,
    });
    // OpenAI guarantees order matches input
    return response.data.map(d => d.embedding);
  }

  countTokens(text: string, model: string = 'gpt-4o'): number {
    try {
      const enc = encodingForModel(model as TiktokenModel);
      return enc.encode(text).length;
    } catch {
      // Fallback: ~4 chars per token
      return Math.ceil(text.length / 4);
    }
  }
}
