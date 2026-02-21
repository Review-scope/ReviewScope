import type { ContextLayer, ContextInput } from '../layers.js';

export const complexityAssessmentLayer: ContextLayer = {
  name: 'complexity-assessment',
  async getContext(input: ContextInput): Promise<string> {
    if (!input.complexity) {
      return '';
    }

    const { tier, score, reason, factors } = input.complexity;
    
    return `## Complexity Assessment
Tier: ${tier?.toUpperCase() || 'UNKNOWN'}
Score: ${score || 0}
Reason: ${reason || 'N/A'}

### Impact Factors
- Files Changed: ${factors?.fileCount || 0}
- Lines Changed: ${factors?.linesChanged || 0}
- File Risk: ${factors?.fileRisk || 0}
- Risk Patterns: ${factors?.riskPatterns || 0}
`;
  },
};
