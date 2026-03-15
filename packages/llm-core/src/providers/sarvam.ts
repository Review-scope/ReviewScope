import { SarvamAIClient } from 'sarvamai';
import type { LLMProvider, Message, ChatOptions, ChatResponse, EmbeddingProvider, EmbeddingOptions } from '../types.js';

export class SarvamProvider implements LLMProvider, EmbeddingProvider {
  name = 'sarvam';
  defaultModel = 'sarvam-m';
  defaultSize = 0;
  supportsStreaming = false as const;

  private client: SarvamAIClient;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('SarvamProvider requires a user-provided API key.');
    }
    this.client = new SarvamAIClient({ apiSubscriptionKey: apiKey });
  }

  async chat(messages: Message[], options: ChatOptions): Promise<ChatResponse> {
    const response = await this.client.chat.completions({
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens,
    });

    const choice = response.choices?.[0];
    const usage = response.usage;

    return {
      content: choice?.message?.content || '',
      usage: {
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
      },
    };
  }

  async embed(_text: string, _options: EmbeddingOptions): Promise<number[]> {
    throw new Error('Sarvam provider does not support embeddings');
  }

  async embedBatch(_texts: string[], _options: EmbeddingOptions): Promise<number[][]> {
    throw new Error('Sarvam provider does not support embeddings');
  }

  countTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
