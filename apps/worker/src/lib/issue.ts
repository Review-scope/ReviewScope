import { GitHubClient } from './github.js';

/**
 * Extract issue numbers from PR body
 * Supports "Fixes #123", "Resolves #123", "Closes #123", and just "#123" if explicitly linked
 * For now, strict regex for specific keywords to avoid noise.
 */
export function parseIssueReferences(prBody: string): number[] {
  if (!prBody) return [];
  
  // GitHub conventions: https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue
  const regex = /(?:fix|fixes|fixed|resolve|resolves|resolved|close|closes|closed)\s+#(\d+)/gi;
  const matches = [...prBody.matchAll(regex)];
  
  // Dedup and parse
  const issues = new Set<number>();
  for (const match of matches) {
    if (match[1]) {
      issues.add(parseInt(match[1], 10));
    }
  }

  return Array.from(issues);
}

/**
 * Clean issue body for LLM consumption
 * - Removes image markdown (useless for text LLMs)
 * - Removes video embeds
 * - Removes HTML image tags
 * - Trims excessive whitespace
 */
function cleanIssueBody(body: string | null): { cleaned: string; hasMedia: boolean; isVague: boolean } {
  if (!body || body.trim() === '') {
    return { cleaned: '', hasMedia: false, isVague: true };
  }

  let cleaned = body;
  let hasMedia = false;

  // Detect and remove markdown images: ![alt](url)
  if (/!\[.*?\]\(.*?\)/g.test(cleaned)) {
    hasMedia = true;
    cleaned = cleaned.replace(/!\[.*?\]\(.*?\)/g, '[image attached]');
  }

  // Detect and remove HTML images: <img src="..." />
  if (/<img[^>]*>/gi.test(cleaned)) {
    hasMedia = true;
    cleaned = cleaned.replace(/<img[^>]*>/gi, '[image attached]');
  }

  // Detect and remove video links (common patterns)
  if (/https?:\/\/[^\s]+\.(mp4|mov|webm|gif)/gi.test(cleaned)) {
    hasMedia = true;
    cleaned = cleaned.replace(/https?:\/\/[^\s]+\.(mp4|mov|webm|gif)/gi, '[video attached]');
  }

  // Remove GitHub video uploads
  if (/https:\/\/github\.com\/.*\/assets\/\d+/gi.test(cleaned)) {
    hasMedia = true;
    cleaned = cleaned.replace(/https:\/\/github\.com\/.*\/assets\/\d+/gi, '[media attached]');
  }

  // Clean up multiple consecutive newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  // Check if issue is vague (too short or lacks substance)
  const textWithoutMedia = cleaned.replace(/\[(?:image|video|media) attached\]/g, '').trim();
  const wordCount = textWithoutMedia.split(/\s+/).filter(w => w.length > 2).length;
  const isVague = wordCount < 10; // Less than 10 meaningful words

  return { cleaned, hasMedia, isVague };
}

export async function fetchIssueContext(
  client: GitHubClient,
  installationId: number,
  owner: string,
  repo: string,
  issueNumbers: number[]
): Promise<string> {
  if (issueNumbers.length === 0) return '';

  const issues: string[] = [];

  for (const issueNumber of issueNumbers) {
    try {
      const issue = await client.getIssue(installationId, owner, repo, issueNumber);
      if (issue) {
        const { cleaned, hasMedia, isVague } = cleanIssueBody(issue.body);
        
        let issueText = `Issue #${issueNumber}: ${issue.title}\nStatus: ${issue.state}`;
        
        // Add warnings for AI context
        if (isVague && hasMedia) {
          issueText += `\n⚠️ Note: This issue has minimal text description and relies on attached images/videos which cannot be analyzed.`;
        } else if (isVague) {
          issueText += `\n⚠️ Note: This issue has a vague or minimal description. Focus on the PR changes and title for context.`;
        } else if (hasMedia) {
          issueText += `\n⚠️ Note: This issue contains images/videos that cannot be analyzed. Text description provided below.`;
        }
        
        if (cleaned) {
          issueText += `\nDescription:\n${cleaned}`;
        } else {
          issueText += `\nDescription: (empty or media-only)`;
        }
        
        issues.push(issueText);
      }
    } catch (error) {
      console.error(`Failed to fetch issue #${issueNumber}:`, error);
    }
  }

  return issues.join('\n\n---\n\n');
}
