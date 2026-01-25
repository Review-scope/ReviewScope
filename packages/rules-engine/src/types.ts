/**
 * Rules Engine Types
 */

export interface PRDiff {
  files: DiffFile[];
  prBody?: string;
  issueContext?: string;
}

export interface DiffFile {
  path: string;
  additions: DiffLine[];
  deletions: DiffLine[];
  content?: string;
  parsed?: unknown;
}

export interface DiffLine {
  lineNumber: number;
  content: string;
}

export type RuleSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';

export interface RuleContext {
  file: DiffFile;
  diff: PRDiff;
}

export interface RuleResult {
  ruleId: string;
  file: string;
  line: number;
  severity: RuleSeverity;
  message: string;
  snippet?: string;
}

export interface Rule {
  id: string;
  description: string;
  severity: RuleSeverity;
  appliesTo: string[]; // file globs
  detect(ctx: RuleContext): RuleResult[] | null | Promise<RuleResult[] | null>;
}

// Legacy types for backward compatibility during migration (if needed)
export type RuleViolation = RuleResult;
