import type { ContextLayer, ContextInput } from '../layers.js';

export const issueIntentLayer: ContextLayer = {
  name: 'issue-intent',
  async getContext(input: ContextInput): Promise<string> {
    if (!input.issueContext) return '';
    
    return `Linked Issue Context:
${input.issueContext}
`;
  },
};
