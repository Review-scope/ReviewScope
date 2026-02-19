import { GoogleGenAI } from '@google/genai';
import { GoogleGenerativeAI, type GenerateContentResult } from '@google/generative-ai';
import type { LLMProvider, Message, ChatOptions, ChatResponse, EmbeddingProvider, EmbeddingOptions } from '../types.js';

export class GeminiProvider implements LLMProvider, EmbeddingProvider {
  name = 'gemini';
  defaultModel = 'gemini-embedding-001';
  defaultSize = 768;
  supportsStreaming = false as const;

  private readonly apiKey: string;
  private genaiClient?: GoogleGenAI;
  private legacyClient?: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: Message[], options: ChatOptions): Promise<ChatResponse> {
    try {
      return await this.chatViaGenAI(messages, options);
    } catch (error: unknown) {
      if (!this.shouldFallback(error)) throw error;
      console.warn('[GeminiProvider] Falling back to @google/generative-ai for chat due to SDK compatibility issue.');
      return this.chatViaLegacy(messages, options);
    }
  }

  async embed(text: string, options: EmbeddingOptions): Promise<number[]> {
    try {
      return await this.embedViaGenAI(text, options);
    } catch (error: unknown) {
      if (!this.shouldFallback(error)) throw error;
      console.warn('[GeminiProvider] Falling back to @google/generative-ai for embeddings due to SDK compatibility issue.');
      return this.embedViaLegacy(text, options);
    }
  }

  async embedBatch(texts: string[], options: EmbeddingOptions): Promise<number[][]> {
    const results: number[][] = [];
    
    // Process in small sub-batches to avoid overwhelming the connection or API
    const SUB_BATCH_SIZE = 5;
    for (let i = 0; i < texts.length; i += SUB_BATCH_SIZE) {
      const chunk = texts.slice(i, i + SUB_BATCH_SIZE);
      const promises = chunk.map(async (t) => {
        let retries = 2;
        while (retries >= 0) {
          try {
            return await this.embed(t, options);
          } catch (e: unknown) {
            if (retries === 0) throw e;
            retries--;
            await new Promise(r => setTimeout(r, 500));
          }
        }
        throw new Error('Failed to embed after retries');
      });
      
      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
      
      if (i + SUB_BATCH_SIZE < texts.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
    
    return results;
  }

  countTokens(text: string): number {
    // Rough approximation
    return Math.ceil(text.length / 4);
  }

  private getGenAIClient(): GoogleGenAI {
    if (!this.genaiClient) {
      this.genaiClient = new GoogleGenAI({ apiKey: this.apiKey });
    }
    return this.genaiClient;
  }

  private getLegacyClient(): GoogleGenerativeAI {
    if (!this.legacyClient) {
      this.legacyClient = new GoogleGenerativeAI(this.apiKey);
    }
    return this.legacyClient;
  }

  private async chatViaGenAI(messages: Message[], options: ChatOptions): Promise<ChatResponse> {
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversation = messages.filter((m) => m.role !== 'system');
    const contents = conversation.length > 0
      ? conversation.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }))
      : [{ role: 'user', parts: [{ text: '' }] }];

    const response = await this.getGenAIClient().models.generateContent({
      model: options.model,
      contents,
      config: {
        systemInstruction: systemMessage ? {
          role: 'system',
          parts: [{ text: systemMessage.content }]
        } : undefined,
        temperature: options.temperature ?? 0.3,
        maxOutputTokens: options.maxTokens,
        responseMimeType: options.responseFormat === 'json' ? 'application/json' : 'text/plain',
      },
    });

    const text = response.text || '';
    const usage = this.normalizeUsage(response.usageMetadata);

    return {
      content: text,
      usage,
    };
  }

  private async chatViaLegacy(messages: Message[], options: ChatOptions): Promise<ChatResponse> {
    const systemMessage = messages.find((m) => m.role === 'system');
    const userMessages = messages.filter((m) => m.role !== 'system');
    const model = this.getLegacyClient().getGenerativeModel({ 
      model: options.model,
      systemInstruction: systemMessage ? {
        role: 'system',
        parts: [{ text: systemMessage.content }]
      } : undefined
    });

    let prompt = '';
    for (const msg of userMessages) {
      if (msg.role === 'user') {
        prompt += `User: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        prompt += `Assistant: ${msg.content}\n`;
      }
    }

    const result: GenerateContentResult = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.3,
        maxOutputTokens: options.maxTokens,
        responseMimeType: options.responseFormat === 'json' ? 'application/json' : 'text/plain',
      },
    });

    const response = result.response;
    const text = response.text();
    const usage = (response as unknown as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } }).usageMetadata;

    return {
      content: text,
      usage: this.normalizeUsage(usage),
    };
  }

  private async embedViaGenAI(text: string, options: EmbeddingOptions): Promise<number[]> {
    const outputDimensionality = options.dimensions ?? this.defaultSize;
    const response = await this.getGenAIClient().models.embedContent({
      model: options.model,
      contents: text,
      config: { outputDimensionality },
    });
    const embedding = response.embeddings?.[0]?.values;
    if (!embedding) {
      throw new Error('No embedding returned from @google/genai');
    }
    return embedding;
  }

  private async embedViaLegacy(text: string, options: EmbeddingOptions): Promise<number[]> {
    const model = this.getLegacyClient().getGenerativeModel({ model: options.model });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  private normalizeUsage(usage?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  }): ChatResponse['usage'] {
    return {
      promptTokens: usage?.promptTokenCount || 0,
      completionTokens: usage?.candidatesTokenCount || 0,
      totalTokens: usage?.totalTokenCount || 0,
    };
  }

  private shouldFallback(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const maybe = error as { message?: string; status?: number };
    const status = maybe.status;
    if (status === 401 || status === 403 || status === 404) {
      return false;
    }

    const message = (maybe.message || '').toLowerCase();
    if (!message) return false;

    const neverFallbackTokens = [
      'invalid api key',
      'api key not valid',
      'permission denied',
      'unauthenticated',
      'authentication',
      'model not found',
      'not found',
      'access denied',
      'forbidden',
      'insufficient permissions',
      'quota',
      'rate limit',
      '429',
      '400',
      '401',
      '403',
      '404',
    ];
    if (neverFallbackTokens.some((token) => message.includes(token))) {
      return false;
    }

    const fallbackTokens = [
      'is not a function',
      'not supported',
      'unknown field',
      'unknown parameter',
      'cannot read properties',
      'sdk compatibility',
      'unsupported',
      'invalid value at',
    ];

    return fallbackTokens.some((token) => message.includes(token));
  }
}
