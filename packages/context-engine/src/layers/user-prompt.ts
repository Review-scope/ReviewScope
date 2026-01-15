import type { ContextLayer, ContextInput } from '../layers.js';

export const userPromptLayer: ContextLayer = {
  name: 'user-prompt',
  maxTokens: 1000,
  async getContext(input: ContextInput): Promise<string> {
    if (!input.userPrompt) return '';

    // Sandbox: strip any attempt to override system instructions
    const sanitized = input.userPrompt
      .replace(/ignore previous instructions/gi, '')
      .replace(/forget everything/gi, '')
      .replace(/system:/gi, '')
      .trim();

    if (!sanitized) return '';

    return `## Additional Review Guidelines (User Provided)

${sanitized}`;
  },
};
