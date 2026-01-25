import type { Rule, RuleContext, RuleResult } from '../types.js';

export const nPlusOneRule: Rule = {
  id: 'n-plus-one',
  description: 'API or Database call detected inside a loop',
  severity: 'MAJOR',
  appliesTo: ['*.ts', '*.js', '*.py', '*.go', '*.java'],
  detect(ctx: RuleContext): RuleResult[] {
    const results: RuleResult[] = [];
    
    // Simple heuristic: Look for `await` or `fetch` or `db.` inside `map`, `forEach`, `for` loop body lines.
    // Iterating lines is safer than full source regex.
    
    let inLoop = false;
    let loopDepth = 0;
    
    // Note: This line-by-line state machine is fragile for diffs because we might not see the loop start/end.
    // But we try our best on the *added* code.
    
    for (const line of ctx.file.additions) {
        if (/for\s*\(|while\s*\(|\.map\(|\.forEach\(/.test(line.content)) {
            inLoop = true;
            loopDepth++;
        }
        if (line.content.includes('}')) {
            loopDepth = Math.max(0, loopDepth - 1);
            if (loopDepth === 0) inLoop = false;
        }
        
        if (inLoop && (
            line.content.includes('await ') || 
            line.content.includes('fetch(') || 
            /db\.|repository\./.test(line.content)
        )) {
            // Check if it's Promise.all
            if (!line.content.includes('Promise.all')) {
                results.push({
                    ruleId: this.id,
                    file: ctx.file.path,
                    line: line.lineNumber,
                    severity: this.severity,
                    message: 'Potential N+1 problem: Async/DB call inside a loop. Use Promise.all() or batching.',
                    snippet: line.content.trim()
                });
            }
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
