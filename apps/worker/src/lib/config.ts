import { GitHubClient } from './github.js';
import type { ReviewScopeConfig } from '@reviewscope/rules-engine';

export async function fetchConfig(
  gh: GitHubClient,
  installationId: number,
  owner: string,
  repo: string,
  headSha: string
): Promise<ReviewScopeConfig | undefined> {
  const paths = ['.reviewscope.json', '.github/reviewscope.json', '.diffmind.json', '.github/diffmind.json'];

  for (const path of paths) {
    try {
      const content = await gh.getFileContent(installationId, owner, repo, path, headSha);
      
      // Handle missing file or empty content
      if (content === null || content.trim() === '') {
        continue;
      }

      const parsed = JSON.parse(content);
      
      // Ensure the result is an object
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as ReviewScopeConfig;
      }
    } catch (e) {
      console.warn(`[Config] Failed to fetch or parse config at ${path}:`, e instanceof Error ? e.message : e);
      // Continue to next path
    }
  }

  return undefined;
}
