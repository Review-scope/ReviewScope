import { GoogleGenerativeAI, type GenerateContentResult } from '@google/generative-ai';
import type { LLMProvider, Message, ChatOptions, ChatResponse, EmbeddingProvider, EmbeddingOptions } from '../types.js';

export class GeminiProvider implements LLMProvider, EmbeddingProvider {
  name = 'gemini';
  defaultModel = 'text-embedding-004';
  defaultSize = 768;
  supportsStreaming = false as const;

  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async chat(messages: Message[], options: ChatOptions): Promise<ChatResponse> {
    const systemMessage = messages.find((m) => m.role === 'system');
    const userMessages = messages.filter((m) => m.role !== 'system');

    const model = this.client.getGenerativeModel({ 
      model: options.model,
      systemInstruction: systemMessage ? {
        role: 'system',
        parts: [{ text: systemMessage.content }]
      } : undefined
    });

    // Convert messages to Gemini format
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

    // Token counts may not be available in all SDK versions
    const usage = (response as unknown as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } }).usageMetadata;

    return {
      content: text,
      usage: {
        promptTokens: usage?.promptTokenCount || 0,
        completionTokens: usage?.candidatesTokenCount || 0,
        totalTokens: usage?.totalTokenCount || 0,
      },
    };
  }

  async embed(text: string, options: EmbeddingOptions): Promise<number[]> {
    const model = this.client.getGenerativeModel({ model: options.model });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  async embedBatch(texts: string[], options: EmbeddingOptions): Promise<number[][]> {
    const model = this.client.getGenerativeModel({ model: options.model });
    const results: number[][] = [];
    
    // Process in small sub-batches to avoid overwhelming the connection or API
    const SUB_BATCH_SIZE = 5;
    for (let i = 0; i < texts.length; i += SUB_BATCH_SIZE) {
      const chunk = texts.slice(i, i + SUB_BATCH_SIZE);
      const promises = chunk.map(async (t) => {
        let retries = 2;
        while (retries >= 0) {
          try {
            const result = await model.embedContent(t);
            return result.embedding.values;
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
}
