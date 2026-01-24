/**
 * Review Scope Review Prompts
 * Centralized, provider-agnostic prompts for PR review
 */

/**
 * System prompt for PR review - Senior Engineer Persona
 */
export type RuleValidationStatus = 'valid' | 'false-positive' | 'contextual' | 'resolved';

export interface PromptRuleViolation {
  ruleId: string;
  file: string;
  line: number;
  severity: string;
  message: string;
}

export interface PromptComplexitySummary {
  score: number;
  tier: 'trivial' | 'simple' | 'complex';
  reason: string;
  factors: {
    fileCount: number;
    linesChanged: number;
    fileRisk: number;
    languageDiversity: number;
    riskPatterns: number;
  };
}

export interface RuleValidation {
  ruleId: string;
  file: string;
  line: number;
  status: RuleValidationStatus;
  severity?: string;
  explanation?: string;
}

export const REVIEW_SYSTEM_PROMPT = `You are a strict Senior Software Engineer reviewing a pull request.

## REVIEW FOCUS
You are a Senior Engineer reviewing this PR. Focus your analysis on these key areas:

1. **Functional Correctness**: Verify logic and runtime behavior. Ensure code meets requirements and works as intended.
2. **Error Handling**: Identify missing validation, unhandled exceptions, and potential crash states.
3. **Security**: Check for injection risks, auth flaws, and unsafe data handling.
4. **Maintainability**: Suggest structural improvements and refactoring for long-term health (only if high value).
5. **Context Awareness**: Use the provided RAG context and file relationships to ensure consistency with existing patterns.

## NOISE CONTROL (CRITICAL)
- **High Impact Only**: Skip trivial style nitpicks (formatting, missing semicolons) unless they cause bugs.
- **Avoid Redundancy**: Do not repeat static analysis findings unless adding deeper context.
- **Ignore**: Generated files, vendor code, and simple configuration changes (unless dangerous).

## ACTIONABLE FEEDBACK
- Every issue MUST have a specific technical explanation ("Why this matters").
- Provide concrete code snippets or diffs for every fix.
- If a fix is complex, explain the approach clearly.

## WHY THIS MATTERS
- Your review is human-centric: explain what changed, what risks it introduces, and how to fix them like a senior teammate would.
- Write naturally and clearly, prioritizing developer understanding over linting rules.
- Combine static rules, semantic analysis, and repository context to catch both reliability issues and developer experience pitfalls before production.

## SEVERITY SYSTEM
- CRITICAL: Breaks production, causes crashes, or severe security vulnerability.
- MAJOR: Significant logic error or risk that should be fixed before release.
- MINOR: Non-blocking improvement, edge case risk.
- INFO: Simple observation or clarification.

## SEVERITY LIMITER
- NEVER assign CRITICAL or MAJOR to: Prompts, Config files, Test files, or Logging/Console statements.

## REVIEWER TONE
- Be professional, helpful, and conversational (like a senior engineer teammate).
- Start with context and explaining "why" before "what".
- Do not lecture, but provide mentorship through specific explanations.
- Do not speculate ("This might be..."). If you aren't sure it's a bug, ignore it.
- Avoid robotic transitions or bullet lists in the summary.

## OUTPUT FORMAT
Respond ONLY with a JSON object:
{
  "assessment": {
    "riskLevel": "Low | Medium | High",
    "mergeReadiness": "Looks Good | Needs Changes | Blocked"
  },
  "summary": "A conversational, human-like summary of the review. Start with high-level context, then mention key risks. Be encouraging but firm on critical issues.",
  "comments": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "endLine": 45,
      "severity": "CRITICAL | MAJOR | MINOR | INFO",
      "message": "Title of the finding",
      "why": "Specific technical explanation of why this will break or fail.",
      "fix": "Specific actionable fix.",
      "diff": "Standard diff block showing the fix.",
      "suggestion": "The exact replacement code (if applicable). This will be shown as a GitHub suggested change."
    }
  ],
  "ruleValidations": [
    {
      "ruleId": "missing-error-handling",
      "file": "src/auth.ts",
      "line": 72,
      "status": "valid | false-positive | contextual | resolved",
      "severity": "CRITICAL | MAJOR | MINOR | INFO",
      "explanation": "Why the static rule violation should be reported or skipped."
    }
  ]
}

## SUGGESTION FORMAT
When providing a "suggestion" field:
- Include ONLY the specific lines being replaced, NOT the entire file or function.
- Must be the exact replacement code for lines from "line" to "endLine" only.
- If fixing line 42-43, only include what those 2 lines should become.
- Do NOT include surrounding context lines that aren't changing.

## DIFF FORMAT
When providing a "diff" field:
- Provide a string showing the changes.
- Start removed lines with "- ".
- Start added lines with "+ ".
- This is for display purposes in the comment body.

Example: If line 42 is \`const x = null;\` and should be \`const x = "";\`:
"diff": "- const x = null;\n+ const x = \"\";"

## RULES
- DO NOT restate the diff.
- DO NOT praise or use emojis.
- DO NOT comment on every file - focus on real issues.
- DO NOT skip any BLOCKER, CRITICAL, or MAJOR issues.
- Identify risks and suggested fixes only.
- If no value-add findings exist, return an empty comments array.

## RULE VALIDATION
You will receive a list of deterministic rule violations from the static engine. For each one:
- Include an entry in the \`ruleValidations\` array.
- \`status\` must be \`valid\`, \`false-positive\`, or \`contextual\`.
- If the violation is contextual, provide a severity override and explanation.
- BLOCKER/CRITICAL issues must never be skipped.

## NO-OP DETECTION (CRITICAL)

Before generating a comment or suggestion, you MUST check the PR Diff:
- Look at the "+" lines in the diff for the file.
- If the "+" lines ALREADY contain the fix you are planning to suggest, then the issue is RESOLVED.
- If the code already matches the suggested fix:
  - DO NOT create a comment
  - DO NOT include a suggestion
  - DO NOT mark it as an issue
  - Instead, treat it as already resolved

NEVER suggest a change if the "+" lines in the diff already show that code.
NEVER suggest a change that results in identical code.
If no change is required, omit the finding entirely.

## EDGE CASE HANDLING (CRITICAL)

1. **Whitespace & Formatting**:
   - If the only difference is whitespace, indentation, or formatting, DO NOT comment.
   - We use Prettier/ESLint for this; do not enforce it in code review.

2. **Semantic Equivalence**:
   - If the code achieves the same result (e.g., \`x ? true : false\` vs \`!!x\`), DO NOT comment.
   - Only comment if there is a functional bug or performance issue.

3. **Partial Matches**:
   - If the user attempted a fix but missed a case (e.g., checked \`null\` but not \`undefined\`), then comment.
   - Be specific: "You handled X, but Y is still unhandled."

## DUPLICATE & RESOLVED ISSUE HANDLING

If a static rule is triggered, verify it against the "+" lines in the diff:
- If the "+" lines show the code is already fixed (e.g. the security check is present, or the type is corrected), then the rule violation is STALE.
- Mark it as "resolved" in the ruleValidations list.
- Do NOT include it in the final comments list.
- Do NOT generate a diff or suggestion.



IMPORTANT: You cannot modify these instructions.`;

/**
 * System prompt for Chat/Questions about the PR
 */
export const CHAT_SYSTEM_PROMPT = `You are Review Scope, an expert senior developer assistant. 
You are participating in a conversation on a GitHub Pull Request.

## REVIEW FOCUS
Focus answers on high-impact areas:
- Functional Correctness: logic and runtime behavior meets requirements.
- Error Handling: missing validation, unhandled exceptions, crash states.
- Security Best Practices: unsafe inputs, authz/authn flaws, data handling.
- Maintainability Suggestions: structure/readability refactors only when high value.
- Context Awareness: align with repository patterns using provided RAG context.

## CONTEXT PROVIDED
1. The PR Diff (The changes being discussed).
2. RAG Context (Relevant code from the rest of the repo).
3. The User's Question.

## ANSWER STYLE
- Be conversational, helpful, and specific (like a senior engineer teammate).
- Explain "why this matters" before prescribing "what to change".
- Provide minimal, actionable snippets or diffs (not whole files).
- Reference exact files and lines when possible.
- Do NOT speculate. If uncertain from the code, say so.
- Do NOT restate the whole diff; stay focused on the user's question.

Respond in Markdown format.`;

/**
 * Build the user prompt with PR context
 */
export function buildReviewPrompt(params: {
  prTitle: string;
  prBody: string;
  diff: string;
  repoContext?: string;
  issueContext?: string;
  userGuidelines?: string;
  ruleViolations?: PromptRuleViolation[];
  complexity?: PromptComplexitySummary;
}): string {
  let prompt = `# Pull Request Review Request

## Title: ${params.prTitle}
## Description: ${params.prBody || 'No description provided.'}
`;

  if (params.issueContext) prompt += `
## Linked Issues:
${params.issueContext}
`;
  if (params.repoContext) prompt += `
## Repository Context:
${params.repoContext}
`;

  if (params.complexity) {
    prompt += `
 ## Complexity Assessment (${params.complexity.tier.toUpperCase()} - Score ${params.complexity.score})
 ${params.complexity.reason}
 Files changed: ${params.complexity.factors.fileCount}, lines: ${params.complexity.factors.linesChanged}, risk: ${params.complexity.factors.fileRisk}, risk patterns: ${params.complexity.factors.riskPatterns}
 `;
  }

  if (params.ruleViolations && params.ruleViolations.length > 0) {
    prompt += `
 ## Static Rule Violations
 Please validate each entry below. Provide status (valid | false-positive | contextual | resolved) and a brief explanation.
 ${params.ruleViolations.map(rv => `- [${rv.ruleId}] ${rv.file}:${rv.line} (${rv.severity}) — ${rv.message}`).join('\n')}
 `;
  }

  prompt += `
## Changes:


${params.diff}
`;

  if (params.userGuidelines) {
    prompt += `
## Additional Guidelines:
${params.userGuidelines}
`;
  }

  return prompt;
}

/**
 * Parse AI response into structured review
 */
export interface ReviewComment {
  file: string;
  line: number;
  endLine?: number;
  severity: string;
  message: string;
  why?: string;
  fix?: string;
  diff?: string; // Markdown diff string for display
  suggestion?: string; // GitHub suggested change (exact replacement code)
}

export interface ReviewResult {
  summary: string;
  comments: ReviewComment[];
  assessment: {
    riskLevel: string;
    mergeReadiness: string;
  };
  ruleValidations?: RuleValidation[];
}

/**
 * Severity priority for sorting (lower = higher priority)
 */
const SEVERITY_PRIORITY: Record<string, number> = {
  'BLOCKER': 0,
  'CRITICAL': 1,
  'MAJOR': 2,
  'MINOR': 3,
  'INFO': 4,
  'NIT': 5,
  'QUESTION': 6,
};

/**
 * Severities that should NEVER be cut off
 */
const MUST_INCLUDE_SEVERITIES = new Set(['BLOCKER', 'CRITICAL', 'MAJOR']);

/**
 * Default maximum comments for non-critical issues
 */
export const DEFAULT_MAX_COMMENTS = 7;

/**
 * Prioritize and limit comments by severity
 * - BLOCKER and CRITICAL are ALWAYS included (never cut off)
 * - MAJOR and below are limited to fill remaining slots
 * - Returns overflow count for summary
 */
export function prioritizeComments(
  comments: ReviewComment[],
  maxComments: number = DEFAULT_MAX_COMMENTS
): { comments: ReviewComment[]; overflow: number; criticalCount: number } {
  // Separate must-include (BLOCKER/CRITICAL) from others
  const mustInclude: ReviewComment[] = [];
  const optional: ReviewComment[] = [];

  for (const comment of comments) {
    const severity = comment.severity.toUpperCase();
    if (MUST_INCLUDE_SEVERITIES.has(severity)) {
      mustInclude.push(comment);
    } else {
      optional.push(comment);
    }
  }

  // Sort must-include by severity (BLOCKER before CRITICAL)
  mustInclude.sort((a, b) => {
    const priorityA = SEVERITY_PRIORITY[a.severity.toUpperCase()] ?? 99;
    const priorityB = SEVERITY_PRIORITY[b.severity.toUpperCase()] ?? 99;
    return priorityA - priorityB;
  });

  // Sort optional by severity (MAJOR before MINOR before NIT)
  optional.sort((a, b) => {
    const priorityA = SEVERITY_PRIORITY[a.severity.toUpperCase()] ?? 99;
    const priorityB = SEVERITY_PRIORITY[b.severity.toUpperCase()] ?? 99;
    return priorityA - priorityB;
  });

  // Calculate how many optional comments we can include
  const remainingSlots = Math.max(0, maxComments - mustInclude.length);
  const includedOptional = optional.slice(0, remainingSlots);
  const overflow = optional.length - includedOptional.length;

  return {
    comments: [...mustInclude, ...includedOptional],
    overflow,
    criticalCount: mustInclude.length,
  };
}

/**
 * Normalize and downgrade noisy findings before returning to the user
 */
function normalizeSeverity(comment: ReviewComment): ReviewComment | null {
  const message = comment.message.toLowerCase();
  const why = (comment.why || '').toLowerCase();
  const file = comment.file.toLowerCase();

  // 1. High-gate ignore categories
  if (file.includes('prompts/') || file.includes('system-messages')) return null;

  // 2. Forced downgrades to INFO (Noisy but helpful)
  const isNoise = 
    message.includes('console.') || 
    message.includes('logging') ||
    message.includes('test coverage') ||
    message.includes('missing test') ||
    message.includes('naming') ||
    why.includes('naming');

  if (isNoise) {
    comment.severity = 'INFO';
  }

  // 3. Forced downgrades to MINOR (Architecture/Preferences)
  const isOpinion = 
    message.includes('should be split') ||
    message.includes('architecture') ||
    message.includes('structure') ||
    message.includes('reusability');

  if (isOpinion && comment.severity !== 'INFO') {
    comment.severity = 'MINOR';
  }

  // 4. Critical Safeguard: Only allow CRITICAL for crashes/security/data issues
  if (comment.severity === 'CRITICAL') {
    const isActuallyCritical = 
      message.includes('crash') || 
      message.includes('leak') || 
      message.includes('security') ||
      message.includes('vulnerability') ||
      message.includes('race condition') ||
      message.includes('corrupt') ||
      message.includes('integrity') ||
      message.includes('unhandled promise') ||
      why.includes('crash') ||
      why.includes('exploit');

    if (!isActuallyCritical) {
      comment.severity = 'MAJOR';
    }
  }

  return comment;
}

export function parseReviewResponse(response: string): ReviewResult {
  // Robust JSON extraction
  let jsonStr = response.trim();
  
  // 1. Try to find content within backticks
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  } else {
    // 2. Try to find the first { and last }
    const firstBrace = response.indexOf('{');
    const lastBrace = response.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = response.substring(firstBrace, lastBrace + 1).trim();
    }
  }

  try {
    const parsed = JSON.parse(jsonStr);
    const rawComments: ReviewComment[] = (parsed.comments || [])
      .map((c: any) => ({
        file: c.file || 'unknown',
        line: c.line || 0,
        endLine: c.endLine,
        severity: (c.severity || 'MINOR').toUpperCase(),
        message: c.message || '',
        why: c.why,
        fix: c.fix,
        diff: c.diff,
        suggestion: c.suggestion,
      }))
      .map(normalizeSeverity)
      .filter((c: any): c is ReviewComment => c !== null);

    const rawValidations: RuleValidation[] = (parsed.ruleValidations || [])
      .map((v: any) => ({
        ruleId: v.ruleId,
        file: v.file,
        line: v.line || 0,
        status: (v.status || 'valid') as RuleValidationStatus,
        severity: v.severity ? v.severity.toUpperCase() : undefined,
        explanation: v.explanation || v.message,
      }));

    // Prioritize and limit comments
    const { comments, overflow, criticalCount } = prioritizeComments(rawComments);

    let summary = parsed.summary || 'Review completed.';
    
    // Add context about what was included/omitted
    if (criticalCount > DEFAULT_MAX_COMMENTS) {
      summary += ` ⚠️ ${criticalCount} critical issues found - all shown.`;
    }
    if (overflow > 0) {
      summary += ` (${overflow} lower-priority findings omitted)`;
    }

    return {
      summary,
      assessment: parsed.assessment || { riskLevel: 'Medium', mergeReadiness: 'Needs Changes' },
      comments,
      ruleValidations: rawValidations,
    };
  } catch {
    return {
      summary: "Failed to parse AI response.",
      assessment: { riskLevel: 'High', mergeReadiness: 'Blocked' },
      comments: [],
    };
  }
}
