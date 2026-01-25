import type { Rule, RuleContext, RuleResult } from '../types.js';

export const unsafeAiOutputRule: Rule = {
  id: 'unsafe-ai-output',
  description: 'Unsafe execution of AI/LLM output',
  severity: 'CRITICAL',
  appliesTo: ['*.ts', '*.js', '*.py'],
  detect(ctx: RuleContext): RuleResult[] {
    const results: RuleResult[] = [];
    
    for (const line of ctx.file.additions) {
      if (line.content.includes('eval(')) {
        results.push({
            ruleId: this.id,
            file: ctx.file.path,
            line: line.lineNumber,
            severity: this.severity,
            message: 'Use of eval() detected. Ensure AI output is never passed to eval().',
            snippet: line.content.trim()
        });
      }
      
      // Heuristic: JSON.parse on variable named like "response", "output", "completion"
      if (/JSON\.parse\((.*(response|output|completion|content|choice).*)\)/i.test(line.content) && !line.content.includes('try')) {
         results.push({
            ruleId: this.id,
            file: ctx.file.path,
            line: line.lineNumber,
            severity: this.severity,
            message: 'Parsing potential AI output with JSON.parse() without validation/try-catch.',
            snippet: line.content.trim()
        });
      }
    }
    return results;
  }
};

export const promptAsLogicRule: Rule = {
  id: 'prompt-as-logic',
  description: 'Prompt text seems to contain logic instructions meant for code',
  severity: 'INFO',
  appliesTo: ['*.ts', '*.js', '*.py'],
  detect(ctx: RuleContext): RuleResult[] {
    const results: RuleResult[] = [];
    
    // Heuristic: Long strings containing "if user says", "when X happens", "return Y"
    for (const line of ctx.file.additions) {
        if (/['"`].*if user.*then.*return.*['"`]/i.test(line.content)) {
            results.push({
                ruleId: this.id,
                file: ctx.file.path,
                line: line.lineNumber,
                severity: this.severity,
                message: 'Detected logic-like instructions in string (Prompt Engineering?). Ensure logic is in code, not prompts.',
                snippet: line.content.trim().substring(0, 50) + '...'
            });
        }
    }
    return results;
  }
};
