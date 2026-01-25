import type { Rule, RuleContext, RuleResult } from '../types.js';

export const nPlusOneRule: Rule = {
  id: 'n-plus-one',
  description: 'API or Database call detected inside a loop',
  severity: 'MAJOR',
  appliesTo: ['*.ts', '*.js', '*.py', '*.go', '*.java'],
  detect(ctx: RuleContext): RuleResult[] {
    const results: RuleResult[] = [];
    
    const isAsyncOrIO = (s: string) =>
      /\bawait\b/.test(s) || /\bfetch\s*\(/.test(s) || /db\.|repository\./.test(s);
    const isLoopContext = (s: string) =>
      /\bfor\s*\(/.test(s) || /\bwhile\s*\(/.test(s) || /\.map\s*\(/.test(s) || /\.forEach\s*\(/.test(s) || /\bfor\s+await\s*\(/.test(s);
    const isAsyncCallbackLoop = (s: string) =>
      /\.map\s*\(\s*async\b/.test(s) || /\.forEach\s*\(\s*async\b/.test(s);

    for (const line of ctx.file.additions) {
      const content = line.content;

      // Case 1: async callback inside map/forEach
      if (isAsyncCallbackLoop(content)) {
        results.push({
          ruleId: this.id,
          file: ctx.file.path,
          line: line.lineNumber,
          severity: this.severity,
          message: 'Potential N+1: async callback inside map/forEach. Consider batching or Promise.all().',
          snippet: content.trim()
        });
        continue;
      }

      // Case 2: single line shows loop context and async/IO together
      if (isLoopContext(content) && isAsyncOrIO(content) && !/Promise\.all/.test(content)) {
        results.push({
          ruleId: this.id,
          file: ctx.file.path,
          line: line.lineNumber,
          severity: this.severity,
          message: 'Potential N+1: async/IO call inside loop. Use Promise.all() or batching.',
          snippet: content.trim()
        });
      }
    }
    return results;
  }
};

export const unboundedLoopRule: Rule = {
  id: 'unbounded-loop',
  description: 'Potential unbounded loop detected',
  severity: 'MAJOR',
  appliesTo: ['*.ts', '*.js', '*.py', '*.go', '*.java'],
  detect(ctx: RuleContext): RuleResult[] {
    const results: RuleResult[] = [];
    
    for (const line of ctx.file.additions) {
        if (/while\s*\(\s*true\s*\)/.test(line.content)) {
             results.push({
                ruleId: this.id,
                file: ctx.file.path,
                line: line.lineNumber,
                severity: this.severity,
                message: 'Unbounded loop (while true) detected. Ensure there is a break condition.',
                snippet: line.content.trim()
            });
        }
    }
    return results;
  }
};
