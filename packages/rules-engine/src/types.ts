/**
 * Rules Engine Types
 */

export interface PRDiff {
  files: DiffFile[];
}

export interface DiffFile {
  path: string;
  additions: DiffLine[];
  deletions: DiffLine[];
}

export interface DiffLine {
  lineNumber: number;
  content: string;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  check(diff: PRDiff): RuleViolation[];
}

export interface RuleViolation {
  ruleId: string;
  file: string;
  line: number;
  severity: 'error' | 'warning' | 'suggestion';
  message: string;
}
