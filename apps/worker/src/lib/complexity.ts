/**
 * Complexity Scoring for PR Reviews
 * 
 * Classifies pull requests into complexity tiers (trivial, simple, complex)
 * to optimize model selection and context budgeting:
 * - Trivial: Config, docs, single-line fixes → use cheaper models
 * - Simple: Bug fixes, small refactors → use standard models
 * - Complex: Multi-file changes, architecture → use powerful models
 */

export interface PRAnalysis {
  fileCount: number;
  totalLinesChanged: number;
  highRiskFiles: string[];
  lowRiskFiles: string[];
  languages: Set<string>;
  hasSecurityChanges: boolean;
  hasArchitectureChanges: boolean;
}

export type Complexity = 'trivial' | 'simple' | 'complex';

export interface ComplexityScore {
  score: number; // 0-10 scale
  tier: Complexity;
  reason: string;
  factors: {
    fileCount: number;
    linesChanged: number;
    fileRisk: number;
    languageDiversity: number;
    riskPatterns: number;
  };
}

/**
 * File risk scoring (0-10 scale)
 * Higher score = more critical
 */
function scoreFilePath(path: string): number {
  // Security and auth files
  if (/\b(auth|security|crypto|password|secret|token|key)\b/i.test(path)) {
    return 9;
  }
  
  // Database and schema
  if (/\b(db|database|schema|migration|sql)\b/i.test(path)) {
    return 8;
  }
  
  // API routes and core logic
  if (/\b(api|routes|handlers|middleware|core|service)\b/i.test(path)) {
    return 7;
  }
  
  // Configuration and dependencies
  if (/\.(json|yaml|toml|lock|config)$/i.test(path)) {
    return 4;
  }
  
  // Tests are lower risk
  if (/\.(test|spec)\.|__tests__|test\//.test(path)) {
    return 1;
  }
  
  // Documentation is low risk
  if (/\.(md|txt|rst)$|^(README|CHANGELOG|docs?)\//i.test(path)) {
    return 0;
  }
  
  // Regular source code
  if (/\.(js|ts|tsx|jsx|py|go|rb|php|java|cs)$/.test(path)) {
    return 5;
  }
  
  // Default for unknown
  return 3;
}

/**
 * Extract file extension/language
 */
function getLanguage(path: string): string {
  const match = path.match(/\.(\w+)$/);
  if (!match) return 'unknown';
  
  const ext = match[1].toLowerCase();
  return ext === 'js' ? 'javascript' :
         ext === 'ts' ? 'typescript' :
         ext === 'tsx' ? 'typescript' :
         ext === 'py' ? 'python' :
         ext === 'go' ? 'go' :
         ext === 'json' ? 'json' :
         ext === 'yaml' || ext === 'yml' ? 'yaml' :
         ext === 'md' ? 'markdown' :
         ext;
}

/**
 * Detect risk patterns in changed code
 * Returns count of risk indicators
 */
function detectRiskPatterns(additions: string[]): number {
  let riskCount = 0;
  const content = additions.join('\n');
  
  // Security patterns
  if (/\b(eval|exec|system|shell|spawn|exec)\s*\(/i.test(content)) riskCount += 2;
  if (/\binnerHTML\s*=|dangerouslySetInnerHTML/i.test(content)) riskCount += 2;
  if (/\b(password|secret|token|key|apiKey)\s*[:=]/i.test(content)) riskCount += 3;
  
  // Error handling
  if (/\bcatch\s*\(\w+\)\s*{\s*}/.test(content)) riskCount += 1;
  
  // Database/transaction patterns
  if (/\b(INSERT|UPDATE|DELETE|DROP|ALTER)\b/i.test(content)) riskCount += 2;
  
  // Async/Promise patterns
  if (/\basync\s+\w+|await|Promise\.all|\.then\(/.test(content)) riskCount += 1;
  
  return riskCount;
}

/**
 * Calculate overall PR complexity
 */
export function calculateComplexity(
  fileCount: number,
  filesData: Array<{ path: string; additions: string[] }>
): ComplexityScore {
  const totalLinesChanged = filesData.reduce(
    (sum, f) => sum + f.additions.length,
    0
  );

  // Score individual files
  const fileRisks = filesData.map(f => ({
    path: f.path,
    risk: scoreFilePath(f.path),
    riskPatterns: detectRiskPatterns(f.additions),
  }));

  const highRiskCount = fileRisks.filter(f => f.risk >= 7).length;
  const avgRiskScore = fileRisks.length > 0
    ? fileRisks.reduce((sum, f) => sum + f.risk, 0) / fileRisks.length
    : 0;

  // Detect language diversity
  const languages = new Set(filesData.map(f => getLanguage(f.path)));
  const languageDiversity = languages.size > 1 ? 1 : 0;

  // Total risk pattern count
  const totalRiskPatterns = fileRisks.reduce((sum, f) => sum + f.riskPatterns, 0);

  // Calculate composite score (0-10)
  let score = 0;

  // File count factor (0-3 points)
  if (fileCount <= 1) score += 0;
  else if (fileCount <= 3) score += 1;
  else if (fileCount <= 7) score += 2;
  else score += 3;

  // Lines changed factor (0-2 points)
  if (totalLinesChanged <= 20) score += 0;
  else if (totalLinesChanged <= 100) score += 1;
  else score += 2;

  // File risk factor (0-3 points)
  score += Math.min(3, highRiskCount);

  // Language diversity (0-1 point)
  score += languageDiversity;

  // Risk patterns (0-2 points)
  if (totalRiskPatterns <= 2) score += 0;
  else if (totalRiskPatterns <= 5) score += 1;
  else score += 2;

  // Clamp to 0-10
  score = Math.min(10, Math.max(0, score));

  // Determine tier
  let tier: Complexity;
  let reason: string;

  if (score <= 2) {
    tier = 'trivial';
    reason = 'Config, docs, or single-line changes';
  } else if (score <= 6) {
    tier = 'simple';
    reason = 'Isolated bug fixes or small refactors';
  } else {
    tier = 'complex';
    reason = 'Multi-file changes or architectural updates';
  }

  return {
    score,
    tier,
    reason,
    factors: {
      fileCount,
      linesChanged: totalLinesChanged,
      fileRisk: Math.round(avgRiskScore * 10) / 10,
      languageDiversity,
      riskPatterns: totalRiskPatterns,
    },
  };
}
