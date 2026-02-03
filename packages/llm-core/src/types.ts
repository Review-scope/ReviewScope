/**
 * LLM Provider Types
 * No streaming - deterministic responses only
 */

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface ChatResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * LLM Provider Interface
 * Explicitly no streaming for idempotency
 */
export interface LLMProvider extends EmbeddingProvider {
  name: string;
  supportsStreaming: false;
  chat(messages: Message[], options: ChatOptions): Promise<ChatResponse>;
  countTokens(text: string, model?: string): number;
}

export interface EmbeddingOptions {
  model: string;
  dimensions?: number;
}

export interface EmbeddingProvider {
  name: string;
  defaultModel: string;
  defaultSize: number;
  embed(text: string, options: EmbeddingOptions): Promise<number[]>;
  embedBatch(texts: string[], options: EmbeddingOptions): Promise<number[][]>;
}
