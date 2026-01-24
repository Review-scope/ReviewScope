
import { ParsedFile } from './parser.js';
import { ReviewComment } from '@reviewscope/llm-core';

export interface ValidationOptions {
  maxComments?: number;
}

/**
 * normalize code for comparison by removing all whitespace
 */
function normalizeCode(code: string): string {
  return code.replace(/\s+/g, '').trim();
}

/**
 * Check if the suggestion is a no-op (identical to current code)
 */
export function isNoOpSuggestion(currentCode: string, suggestion: string): boolean {
  return normalizeCode(currentCode) === normalizeCode(suggestion);
}

/**
 * Check if the file should be ignored based on rigorous patterns
 */
export function isIgnoredFile(path: string): boolean {
  const IGNORE_PATTERNS = [
    /node_modules\//,
    /^dist\//,
    /^build\//,
    /^out\//,
    /package-lock\.json$/,
    /yarn\.lock$/,
    /pnpm-lock\.yaml$/,
    /bun\.lockb$/,
    /\.min\.js$/,
    /\.min\.css$/,
    /\.map$/,
    /\.d\.ts$/,
  ];
  return IGNORE_PATTERNS.some(p => p.test(path));
}

/**
 * Check if file is a test or config file that deserves lower severity
 */
export function isTestOrConfigFile(path: string): boolean {
  const PATTERNS = [
    /\.test\./,
    /\.spec\./,
    /__tests__\//,
    /tests\//,
    /config\./,
    /tsconfig\.json/,
    /package\.json/,
    /\.eslintrc/,
    /\.prettierrc/,
    /github\/workflows/,
  ];
  return PATTERNS.some(p => p.test(path));
}

/**
 * Main validation function for review comments
 */
export function validateReviewComments(
  comments: ReviewComment[],
  parsedFiles: ParsedFile[],
  options: ValidationOptions = {}
): ReviewComment[] {
  const { maxComments = 10 } = options;
  const validated: ReviewComment[] = [];
  const seenIssues = new Set<string>();

  // 1. Sort by severity (CRITICAL first) to prioritize valuable comments
  const severityOrder: Record<string, number> = { 
    'BLOCKER': 0,
    'CRITICAL': 1, 
    'MAJOR': 2, 
    'MINOR': 3, 
    'INFO': 4,
    'NIT': 5 
  };
  
  // Create a copy to sort
  const sortedComments = [...comments].sort((a, b) => {
    const sA = a.severity.toUpperCase();
    const sB = b.severity.toUpperCase();
    return (severityOrder[sA] ?? 99) - (severityOrder[sB] ?? 99);
  });

  for (const comment of sortedComments) {
    // Stop if we reached the limit
    if (validated.length >= maxComments) break;

    // 2. File Filter (Dist, Lockfiles, etc.)
    if (isIgnoredFile(comment.file)) continue;

    // 3. Check if file is in the PR diff
    const file = parsedFiles.find(f => f.path === comment.file);
    if (!file) continue;

    // 4. Diff Line Check & Content Extraction
    // We strictly enforce commenting on ADDED lines or lines within the hunk.
    const startLine = comment.line;
    const endLine = comment.endLine || comment.line;

    // Check if the range is valid within any hunk
    const hunk = file.hunks.find(h => 
      startLine >= h.newStart && endLine < h.newStart + h.newLines
    );

    if (!hunk) {
        // Line not in diff hunk -> GitHub will reject
        continue;
    }

    // 5. Content Retrieval for No-Op Check
    // We only support commenting on ADDED lines for suggestions to ensure we have the content
    const currentLines: string[] = [];
    let allLinesAreAdditions = true;

    for (let l = startLine; l <= endLine; l++) {
        const addition = file.additions.find(a => a.lineNumber === l);
        if (addition) {
            currentLines.push(addition.content);
        } else {
            allLinesAreAdditions = false;
        }
    }

    // If we have a suggestion, we MUST match the current code exactly
    if (comment.suggestion) {
        if (!allLinesAreAdditions) {
            // Cannot verify suggestion against context lines (we don't store them)
            // Safer to drop the suggestion to avoid 422 or hallucinations
            delete comment.suggestion;
            delete comment.fix;
        } else {
            const currentCode = currentLines.join('\n');
            if (isNoOpSuggestion(currentCode, comment.suggestion)) {
                // Completely drop no-op comments
                continue;
            }
        }
    } else {
        // If no suggestion, we allow comments on context lines as long as they are in the hunk
        // (Verified by hunk check above)
    }

    // 6. Duplicate Check
    const issueHash = `${comment.file}:${comment.line}:${normalizeCode(comment.message)}`;
    if (seenIssues.has(issueHash)) continue;
    seenIssues.add(issueHash);

    // 7. Severity Adjustment
    if (isTestOrConfigFile(comment.file)) {
      const severity = comment.severity.toUpperCase();
      if (severity === 'CRITICAL' || severity === 'MAJOR') {
        comment.severity = 'MINOR';
      }
    }

    validated.push(comment);
  }

  return validated;
}
