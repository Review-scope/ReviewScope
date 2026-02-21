import type { ContextLayer, ContextInput } from '../layers.js';

export const userQuestionLayer: ContextLayer = {
  name: 'user-question',
  async getContext(input: ContextInput): Promise<string> {
    if (!input.userQuestion) return '';

    return `## User Question
${input.userQuestion}
`;
  },
};
