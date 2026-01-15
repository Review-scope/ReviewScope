import type { ContextLayer, ContextInput } from '../layers.js';

export const prDiffLayer: ContextLayer = {
  name: 'pr-diff',
  maxTokens: 8000,
  async getContext(input: ContextInput): Promise<string> {
    return `## Pull Request: ${input.prTitle}

Repository: ${input.repositoryFullName}
PR #${input.prNumber}

### Description
${input.prBody || 'No description provided.'}

### Changes
\`\`\`diff
${input.diff}
\`\`\``;
  },
};
