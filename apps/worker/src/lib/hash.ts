import { createHash } from 'crypto';

/**
 * Generates a deterministic key for a PR issue to track it across commits.
 */
export function generateIssueKey(params: {
  repositoryId: string;
  prNumber: number;
  filePath: string;
  ruleId: string;
  message: string;
}): string {
  // Normalize message (remove line specific numbers, quotes, etc to avoid hash drift on minor wording changes)
  const normalizedMessage = params.message
    .toLowerCase()
    .replace(/\d+/g, '') // Remove numbers (often line or count specific)
    .replace(/['"`]/g, '')
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();

  // If message includes a code block, strip it for hashing stability
  const messageWithoutCode = normalizedMessage.split('```')[0].trim();

  const input = `${params.repositoryId}:${params.prNumber}:${params.filePath}:${params.ruleId}:${messageWithoutCode}`;
  return createHash('sha256').update(input).digest('hex').substring(0, 16);
}
