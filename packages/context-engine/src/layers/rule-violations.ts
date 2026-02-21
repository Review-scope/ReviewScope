import type { ContextLayer, ContextInput } from '../layers.js';

export const ruleViolationsLayer: ContextLayer = {
  name: 'rule-violations',
  async getContext(input: ContextInput): Promise<string> {
    if (!input.ruleViolations || input.ruleViolations.length === 0) {
      return '';
    }

    const violations = input.ruleViolations as any[];
    
    return `## Static Rule Violations
Please validate each entry below against the provided changes. Provide status (valid | false-positive | contextual | resolved) and a brief technical explanation in your response.

${violations.map(rv => `- [${rv.ruleId}] ${rv.file}:${rv.line} (${rv.severity}) — ${rv.message}`).join('\n')}
`;
  },
};
