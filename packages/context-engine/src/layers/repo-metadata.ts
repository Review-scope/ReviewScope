import type { ContextLayer, ContextInput } from '../layers.js';

export const repoMetadataLayer: ContextLayer = {
  name: 'repo-metadata',
  async getContext(input: ContextInput): Promise<string> {
    return `Repository: ${input.repositoryFullName}
Description: ${input.prBody.slice(0, 500)}...
`;
  },
};
