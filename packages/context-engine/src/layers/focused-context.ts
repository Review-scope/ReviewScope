import type { ContextLayer, ContextInput } from '../layers.js';

export const focusedContextLayer: ContextLayer = {
  name: 'focused-context',
  async getContext(input: ContextInput): Promise<string> {
    if (!input.focusedContext) return '';

    return `${input.focusedContext}
`;
  },
};
