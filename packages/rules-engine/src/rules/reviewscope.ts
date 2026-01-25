import type { Rule, RuleContext, RuleResult } from '../types.js';

export const issueMismatchRule: Rule = {
  id: 'issue-mismatch',
  description: 'PR changes do not seem to align with the linked issue',
  severity: 'MAJOR',
  appliesTo: ['*'], // Applies to the whole PR, but we trigger it once per PR or on first file
  detect(ctx: RuleContext): RuleResult[] {
    // Only run this once per PR (heuristic: run on first file)
    if (ctx.diff.files.length > 0 && ctx.file.path !== ctx.diff.files[0].path) {
      return [];
    }
    
    // Limitation: ctx.diff.prBody and ctx.diff.issueContext might be undefined if not passed.
    if (!ctx.diff.prBody || !ctx.diff.issueContext) return [];

    const issueBody = ctx.diff.issueContext.toLowerCase();
    const prBody = ctx.diff.prBody.toLowerCase();
    const changedFiles = ctx.diff.files.map(f => f.path.toLowerCase()).join(' ');
    
    // Very simple keyword matching
    // Extract keywords from issue (simplified)
    const issueKeywords = issueBody.split(/\s+/).filter(w => w.length > 5);
    const relevantKeywords = issueKeywords.filter(k => changedFiles.includes(k) || prBody.includes(k));
    
    // If very few keywords match, flag it.
    // This is a weak heuristic, so we'll be conservative.
    // If we have an issue context but ZERO overlap in changed file paths or PR body.
    
    if (issueKeywords.length > 0 && relevantKeywords.length === 0) {
         // Return result attached to the first line of the current file
         return [{
            ruleId: this.id,
            file: ctx.file.path,
            line: 1, // Global issue
            severity: this.severity,
            message: 'PR seems unrelated to the linked issue (No shared keywords found in changed files).',
            snippet: 'Issue: ...'
         }];
    }

    return [];
  }
};

export const overengineeringRule: Rule = {
  id: 'overengineering',
  description: 'Significant code increase with seemingly little functional value',
  severity: 'INFO',
  appliesTo: ['*'],
  detect(ctx: RuleContext): RuleResult[] {
    const results: RuleResult[] = [];
    
    // Heuristic: If additions > 100 and deletions < 5 in a single file
    const additions = ctx.file.additions.length;
    const deletions = ctx.file.deletions.length;
    
    if (additions > 100 && deletions < 5 && !ctx.file.path.includes('test')) {
         results.push({
            ruleId: this.id,
            file: ctx.file.path,
            line: 1,
            severity: this.severity,
            message: 'Large amount of new code added with few deletions. Verify if this complexity is needed.',
            snippet: `+${additions} / -${deletions}`
        });
    }
    return results;
  }
};
