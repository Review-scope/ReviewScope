import type { Rule, RuleContext, RuleResult } from '../types.js';

export const silentCatchRule: Rule = {
  id: 'silent-catch',
  description: 'Empty or silent catch block detected',
  severity: 'MAJOR',
  appliesTo: ['*.ts', '*.js', '*.tsx', '*.jsx', '*.java', '*.py'],
  detect(ctx: RuleContext): RuleResult[] {
    const results: RuleResult[] = [];
    
    // JS/TS/Java
    for (const line of ctx.file.additions) {
      if (/catch\s*\(\s*\w+\s*\)\s*\{\s*\}/.test(line.content) || // catch (e) {}
          /catch\s*\(\s*\w+\s*\)\s*\{\s*\/\/.*?\}/.test(line.content)) { // catch (e) { // comment }
        results.push({
          ruleId: this.id,
          file: ctx.file.path,
          line: line.lineNumber,
          severity: this.severity,
          message: 'Silent catch block detected. Always handle or log errors.',
          snippet: line.content.trim()
        });
      }
      
      // Python
      if (ctx.file.path.endsWith('.py')) {
        if (/except\s*:\s*pass/.test(line.content)) {
             results.push({
                ruleId: this.id,
                file: ctx.file.path,
                line: line.lineNumber,
                severity: this.severity,
                message: 'Silent exception handling detected (except: pass).',
                snippet: line.content.trim()
            });
        }
      }
    }
    return results;
  }
};

export const missingNullCheckRule: Rule = {
  id: 'missing-null-check',
  description: 'Potential missing null check or unsafe access',
  severity: 'MAJOR',
  appliesTo: ['*.ts', '*.tsx'],
  detect(ctx: RuleContext): RuleResult[] {
    const results: RuleResult[] = [];
    
    // This is hard to do robustly with regex.
    // We'll look for simple patterns like accessing nested properties without optional chaining
    // in contexts that often require it (like API responses).
    // Heuristic: If we see `data.something.else` deep access without `?`.
    
    for (const line of ctx.file.additions) {
        // Very basic heuristic: multiple dot access on common risky objects
        if (/(response|data|payload|res|req)\.[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+/.test(line.content) && !line.content.includes('?.')) {
            // Low confidence, but flagged as potential issue
            // Skipping for now to avoid noise, or adding with specific warning
            /* 
            results.push({
                ruleId: this.id,
                file: ctx.file.path,
                line: line.lineNumber,
                severity: 'INFO', // Downgraded to INFO
                message: 'Deep property access detected. Consider using optional chaining (?.) if intermediate values can be null.',
                snippet: line.content.trim()
            });
            */
        }
    }
    return results;
  }
};
