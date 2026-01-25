import type { Rule, RuleContext, RuleResult } from '../types.js';

const SECRET_PATTERNS = [
  /['"][A-Za-z0-9]{20,}['"]/, // Generic long string
  /AIza[0-9A-Za-z-_]{35}/, // Google API Key
  /sk-[a-zA-Z0-9]{48}/, // OpenAI API Key
  /(AWS|aws|Aws)[_]?(SECRET|secret|Secret)[_]?(KEY|key|Key)/, // AWS
];

export const hardcodedSecretRule: Rule = {
  id: 'hardcoded-secret',
  description: 'Hardcoded secrets (API keys, tokens, credentials) detected',
  severity: 'CRITICAL',
  appliesTo: ['*'],
  detect(ctx: RuleContext): RuleResult[] {
    const results: RuleResult[] = [];
    
    for (const line of ctx.file.additions) {
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(line.content)) {
          results.push({
            ruleId: this.id,
            file: ctx.file.path,
            line: line.lineNumber,
            severity: this.severity,
            message: 'Potential hardcoded secret detected. Use environment variables instead.',
            snippet: line.content.trim().substring(0, 50) + '...' // Don't log full secret
          });
          break; // One secret per line is enough
        }
      }
    }
    return results;
  }
};

export const unvalidatedInputRule: Rule = {
  id: 'unvalidated-input',
  description: 'Direct usage of user input (req.body, req.query) without validation',
  severity: 'MAJOR',
  appliesTo: ['*.ts', '*.js', '*.tsx', '*.jsx'],
  detect(ctx: RuleContext): RuleResult[] {
    const results: RuleResult[] = [];
    
    for (const line of ctx.file.additions) {
      if (
        (line.content.includes('req.body') || 
         line.content.includes('req.query') || 
         line.content.includes('req.params')) &&
        !line.content.includes('validate') && 
        !line.content.includes('schema') &&
        !line.content.includes('z.') // zod
      ) {
        results.push({
          ruleId: this.id,
          file: ctx.file.path,
          line: line.lineNumber,
          severity: this.severity,
          message: 'Unvalidated user input detected. Ensure request data is validated (e.g., Zod, Joi) before use.',
          snippet: line.content.trim()
        });
      }
    }
    return results;
  }
};
