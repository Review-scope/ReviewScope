
/* eslint-disable no-console */
import { DiffFile } from './parser.js';

const HIGH_RISK_PATTERNS = [
  /auth/i,
  /security/i,
  /permission/i,
  /secret/i,
  /middleware/i,
  /apikey/i,
  /token/i,
];

const INFRA_PATTERNS = [
  /\.env/,
  /docker/i,
  /\.github\/workflows/,
  /tsconfig/,
  /package\.json/, // Critical for dependencies, typically small
  /netlify\.toml/,
  /vercel\.json/,
];

const SRC_PATTERNS = [
  /\.(ts|tsx|js|jsx|py|go|rs|java|c|cpp|h|hpp|rb|php)$/,
];

console.log('Loading scoring patterns...');

const TEST_PATTERNS = [
  /test/i,
  /spec/i,
  /__tests__/,
];

/**
 * Assigns a priority score to a file based on its path and content type.
 * Higher score = Higher priority for AI review.
 */
export function scoreFile(file: DiffFile): number {
  const path = file.path.toLowerCase();
  let score = 0;

  // 1. Backend vs Frontend
  if (path.includes('src/') || path.includes('api/') || path.includes('server/') || path.includes('worker/')) {
    score += 3;
  }

  // 2. Security & Auth (Highest Priority)
  if (HIGH_RISK_PATTERNS.some(p => p.test(path))) {
    score += 7; // Total 10 for auth + backend
  }

  // 3. Infrastructure & Config (High Risk)
  if (INFRA_PATTERNS.some(p => p.test(path))) {
    score += 5;
  }

  // 3.5 Core Logic Patterns
  if (SRC_PATTERNS.some(p => p.test(path))) {
    score += 2;
  }

  // 4. Large Files (more likely to have hidden bugs)
  const lineCount = file.additions.length + file.deletions.length;
  if (lineCount > 300) {
    score += 2;
  }

  // 5. Database
  if (path.includes('db/') || path.includes('schema') || path.includes('model')) {
    score += 5;
  }

  // 6. UI / Components (Lower priority than logic)
  if (path.includes('components/') || path.includes('ui/') || path.includes('styles/')) {
    score -= 2;
  }

  // 7. Tests (Lowest priority, often skipped by humans)
  if (TEST_PATTERNS.some(p => p.test(path))) {
    score -= 5;
  }

  // 8. Documentation (Lowest priority)
  if (path.endsWith('.md')) {
    score -= 8;
  }

  return Math.max(0, score);
}

export function sortAndLimitFiles(files: DiffFile[], maxFiles = 15): DiffFile[] {
  // 1. Score files
  const scored = files.map(f => ({ file: f, score: scoreFile(f) }));

  // 2. Sort by score (DESC)
  scored.sort((a, b) => b.score - a.score);

  // 3. Take top N
  const selection = scored.slice(0, maxFiles).map(x => x.file);
  
  if (scored.length > maxFiles) {
    console.warn(`[Scoring] Capped review at ${maxFiles} files. Skipped ${scored.length - maxFiles} lower-priority files.`);
  }

  return selection;
}
