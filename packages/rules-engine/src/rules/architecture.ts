import type { Rule, RuleContext, RuleResult } from '../types.js';

export const fatControllerRule: Rule = {
  id: 'fat-controller',
  description: 'Controller or Route handler seems overly complex (Business logic leak)',
  severity: 'MINOR',
  appliesTo: ['*controller*', '*route*', '*/api/*'],
  detect(ctx: RuleContext): RuleResult[] {
    const results: RuleResult[] = [];
    
    // Check if file is in a controller/route path
    const isController = /controller|route|api/i.test(ctx.file.path);
    if (!isController) return results;

    // Heuristic: Count lines in additions. If adding a huge chunk to a controller, warn.
    if (ctx.file.additions.length > 50) {
        // Simple heuristic: large additions to controller
        results.push({
            ruleId: this.id,
            file: ctx.file.path,
            line: ctx.file.additions[0].lineNumber,
            severity: this.severity,
            message: 'Large logic block detected in Controller/Route layer. Consider moving business logic to a Service or UseCase.',
            snippet: `+${ctx.file.additions.length} lines`
        });
    }

    // Heuristic: Direct DB calls in controller (e.g., SQL or ORM)
    for (const line of ctx.file.additions) {
        if (/db\.|repository\.|findMany|findOne|executeQuery/.test(line.content)) {
             results.push({
                ruleId: this.id,
                file: ctx.file.path,
                line: line.lineNumber,
                severity: this.severity,
                message: 'Direct database access detected in Controller. Use a Service layer.',
                snippet: line.content.trim()
            });
        }
    }

    return results;
  }
};

export const duplicateLogicRule: Rule = {
  id: 'duplicate-logic',
  description: 'Identical code blocks detected in multiple files',
  severity: 'MINOR',
  appliesTo: ['*'],
  detect(_ctx: RuleContext): RuleResult[] {
    // TODO: Implement cross-file duplication check using _ctx.diff.files
    return [];
  }
};
