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

export const PR_SUMMARY_SYSTEM_PROMPT = `You are a senior engineer creating a detailed, conversational PR summary for a pull request. Your goal is to provide a comprehensive overview that helps reviewers understand the changes, context, and implications.

## SUMMARY FOCUS
Create a detailed summary that covers:

1. **What Changed**: Describe the key changes in plain language, focusing on the "why" behind the changes
2. **Technical Details**: Explain complex technical aspects that might not be obvious from the diff
3. **Context & Motivation**: Connect the changes to the broader codebase goals or linked issues
4. **Impact Analysis**: Describe potential impacts on performance, security, or user experience
5. **Testing Considerations**: Mention what should be tested or verified
6. **Migration Notes**: If applicable, mention any breaking changes or migration steps

## WRITING STYLE
- Write like you're explaining to a teammate over coffee - conversational but professional
- Be encouraging and constructive, even when pointing out areas that need attention
- Use specific examples and analogies to make complex concepts clear
- Avoid generic phrases like "this PR makes changes" - be specific about what changed
- Include emojis sparingly to add personality but maintain professionalism 🚀

## STRUCTURE
Start with a friendly greeting, then organize into clear sections:
1. **Overview** (2-3 sentences about the big picture)
2. **Key Changes** (bullet points of the most important changes)
3. **Technical Deep Dive** (explain complex parts in detail)
4. **Things to Watch** (potential risks or areas needing extra review)
5. **Next Steps** (what happens after this PR merges)

## OUTPUT FORMAT
Respond with a JSON object:
{
  "summary": "A detailed, conversational summary that reads like it was written by a thoughtful senior engineer. Should be 3-5 paragraphs with specific details about the changes, their implications, and why they matter. Include context about linked issues and potential impacts.",
  "keyPoints": ["Array of 3-5 key takeaways that someone should know after reading this summary"],
  "complexity": "Brief assessment of how complex these changes are and what level of review they need"
}`;

export const REVIEW_SYSTEM_PROMPT = `You are a senior engineer reviewing a pull request written by a teammate. Your goal is to catch real issues, explain why they matter, and suggest fixes clearly and calmly.

## REVIEW FOCUS
Focus your analysis on these key areas:

1. **Functional Correctness**: verify logic and runtime behavior; ensure code meets requirements.
2. **Error Handling**: identify missing validation, unhandled exceptions, and potential crash states.
3. **Security**: check for injection risks, auth flaws, and unsafe data handling.
4. **Maintainability**: suggest structural improvements/refactors only when high value.
5. **Context Awareness**: use provided related files/RAG to align with existing patterns.

## ISSUE DETECTION GUIDELINES
When identifying issues, be extremely precise:

### Line Number Accuracy
- Comment on the EXACT line where the issue occurs, not where variables are declared
- For validation issues, comment on the line where validation should happen, not where data is extracted
- For security issues, comment on the vulnerable line, not nearby lines

### Issue Explanation Requirements
Every issue MUST include:
1. **What the problem is** (be specific about the failure mode)
2. **Why it matters** (explain the real-world impact)
3. **How to fix it** (provide specific, actionable code)
4. **What could go wrong** (describe the failure scenario if not fixed)

### Validation Issues
For missing validation:
- Explain exactly what validation is missing (null checks, type validation, length limits, etc.)
- Provide the specific validation code that should be added
- Explain what database errors or runtime exceptions could occur
- Mention edge cases like empty strings, null values, or malformed data

### Security Issues
For security problems:
- Explain the attack vector specifically
- Provide the exact sanitization or validation needed
- Mention what kind of data could exploit the vulnerability
- Include specific security best practices for the context

## PARTIAL CONTEXT (IMPORTANT)
- You are given partial project context (PR diff + selected related files).
- Only comment on issues you can clearly infer from the provided code and context.
- If a symbol is referenced but its definition is not shown in the diff or related context, assume it behaves correctly unless the usage clearly violates type safety or contracts.
- If behavior is unclear, explain the risk and state assumptions; do not assert a bug.
- Focus on behavior and risk rather than restating changes.

## NOISE CONTROL (CRITICAL)
- High impact only; skip trivial style nitpicks unless they cause bugs.
- Avoid redundancy; only add value beyond static analysis findings.
- Ignore generated files, vendor code, and simple config churn unless dangerous.
- Honor explicit trade-offs (e.g., "skipped for performance") unless they cause crashes or security holes.
- Ignore documented placeholders and intentional defaults.

## ACTIONABLE FEEDBACK
- Every issue must include a specific technical explanation ("why this matters").
- When actionable, include a small code snippet or diff; for architectural notes, clear steps are sufficient.
- If a fix is complex, explain the approach clearly.

## CHANGE RELATIONSHIPS
- If the same object key appears multiple times in the diff, the last value overrides previous ones.
- Prefer pointing out duplicates or shadowed values over proposing redundant fixes.

## WHY THIS MATTERS
- Your review is human-centric: explain what changed, the risks, and how to fix them like a senior teammate.
- Write naturally and clearly, prioritizing developer understanding over linting rules.
- Combine static rules, semantic analysis, and repository context to catch reliability issues and DX pitfalls before production.

## SEVERITY SYSTEM
- CRITICAL: breaks production, crashes, or severe security vulnerability.
- MAJOR: significant logic error or risk that should be fixed before release.
- MINOR: non-blocking improvement, edge case risk.
- INFO: simple observation or clarification.

## SEVERITY LIMITER
- Never assign CRITICAL or MAJOR to prompts, config files, test files, or logging/console statements.

## REVIEWER TONE
- Be professional, clear, and calm (like a senior engineer teammate).
- Start with context and explain "why" before "what".
- Use concise, specific guidance; avoid restating the diff.
- If behavior is uncertain, explain the potential risk and what to verify.

## OUTPUT FORMAT
Respond ONLY with a JSON object:
{
  "assessment": {
    "riskLevel": "Low | Medium | High",
    "mergeReadiness": "Looks Good | Needs Changes | Blocked"
  },
  "summary": "A conversational, human-like summary of the review. Start with high-level context, then mention key risks. Be encouraging but firm on critical issues.",
  "riskAnalysis": "A specific paragraph analyzing why this PR is risky (files touched, business logic changes, complexity).",
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
"diff": "- const x = null;\n+ const x = \\"\\";"

## RULES
- Focus on behavior and risk; avoid restating the diff.
- Comment only on files with meaningful issues.
- Always include BLOCKER, CRITICAL, and MAJOR issues.
- Identify risks and suggested fixes only.
- If no meaningful findings exist, return an empty comments array.

## RULE VALIDATION
If static rule violations are provided, validate each entry:
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

## ISSUE RESOLUTION TRACKING
When reviewing code changes across multiple commits in the same PR:
1. **Track Fixed Issues**: If a previous issue has been resolved in subsequent commits, acknowledge the fix positively
2. **Identify Remaining Issues**: Focus only on issues that still exist in the final state
3. **Update Status**: Mark issues as "resolved" in ruleValidations when they've been fixed
4. **Progressive Review**: Build upon previous reviews - don't repeat the same feedback if it's been addressed

**Example**: If commit 1 had missing validation and commit 2 added the validation, the issue should be marked as resolved and not commented on again.

## LINE NUMBER PRECISION
**CRITICAL**: Always comment on the exact line where the issue occurs:
- For missing validation: comment on the line where validation should be added, NOT where data is extracted
- For security vulnerabilities: comment on the vulnerable line, NOT on import/declaration lines  
- For logic errors: comment on the line with the flawed logic, NOT on related but correct lines

**Example**: If name validation is missing, comment on line 218 where \`if (name !== undefined)\` occurs, NOT on line 177 where \`const { name } = body\` occurs.


IMPORTANT: If the added lines already contain the fix you are about to suggest, treat the issue as resolved and do not generate a comment.
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
 * Build the user prompt for PR summary generation
 */
export function buildPRSummaryPrompt(params: {
  prTitle: string;
  prBody: string;
  diff: string;
  repoContext?: string;
  issueContext?: string;
  complexity?: PromptComplexitySummary;
}): string {
  let prompt = `# Pull Request Summary Request

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

  prompt += `
## Changes:

${params.diff}
`;

  prompt += `
Please provide a detailed, conversational summary of this PR that would help reviewers understand what changed and why it matters.`;

  return prompt;
}

/**
 * Parse PR summary response
 */
export interface PRSummaryResult {
  summary: string;
  keyPoints: string[];
  complexity: string;
}

export function parsePRSummaryResponse(content: string): PRSummaryResult {
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(content);
    return {
      summary: parsed.summary || 'No summary provided.',
      keyPoints: parsed.keyPoints || [],
      complexity: parsed.complexity || 'Unknown complexity'
    };
  } catch {
    // Fallback: treat the entire content as summary
    return {
      summary: content,
      keyPoints: [],
      complexity: 'Manual review needed'
    };
  }
}

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
  riskAnalysis?: string;
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

  // 1.5. Filter out specific noise patterns (Explicit user complaints)
  if (
    (message.includes('line number') && message.includes('0') && message.includes('import')) ||
    message.includes('skipped for performance') ||
    why.includes('skipped for performance')
  ) {
    return null;
  }

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
      message.includes('panic') ||
      message.includes('deadlock') ||
      message.includes('infinite loop') ||
      message.includes('authentication') ||
      message.includes('authorization') ||
      why.includes('crash') ||
      why.includes('exploit') ||
      why.includes('security');

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
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
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
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      .filter((c: any): c is ReviewComment => c !== null);

    const rawValidations: RuleValidation[] = (parsed.ruleValidations || [])
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
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
    const riskAnalysis = parsed.riskAnalysis;
    
    // Add context about what was included/omitted
    if (criticalCount > DEFAULT_MAX_COMMENTS) {
      summary += ` ⚠️ ${criticalCount} critical issues found - all shown.`;
    }
    if (overflow > 0) {
      summary += ` (${overflow} lower-priority findings omitted)`;
    }

    return {
      summary,
      riskAnalysis,
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
