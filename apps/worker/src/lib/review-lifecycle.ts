import { GitHubClient } from './github.js';
import { ParsedFile, detectDuplicateKeys } from './parser.js';
import { fetchConfig } from './config.js';
import { parseIssueReferences, fetchIssueContext } from './issue.js';
import type { ReviewScopeConfig } from '@reviewscope/rules-engine';
import { calculateComplexity } from './complexity.js';
import { runRules } from '@reviewscope/rules-engine';
import { RAGRetriever, RAGIndexer } from '@reviewscope/context-engine';
import { createConfiguredProvider } from './ai-review.js';
import { runEnhancedAIReview, AIReviewResult } from './ai-review-enhanced.js';
import { db, reviews, repositories, installations, configs } from '../../../api/src/db/index.js';
import { eq, and } from 'drizzle-orm';
import picomatch from 'picomatch';
import { getPlanLimits, PlanTier, PlanLimits } from './plans.js';
import { ReviewJobData } from '../jobs/review.js';
import { scoreFile } from './scoring.js';
import { ReviewComment } from '@reviewscope/llm-core';

export interface JobContext {
  dbInst: typeof installations.$inferSelect;
  dbRepo: typeof repositories.$inferSelect;
  limits: PlanLimits;
  config: ReviewScopeConfig | null;
  hasCustomKey: boolean;
}

export async function getIssueContext(gh: GitHubClient, data: ReviewJobData): Promise<string> {
  const issueNumbers = parseIssueReferences(data.prBody);
  if (issueNumbers.length === 0) return '';
  const [owner, repo] = data.repositoryFullName.split('/');
  return await fetchIssueContext(gh, data.installationId, owner, repo, issueNumbers);
}

export async function validateJob(data: ReviewJobData): Promise<JobContext> {
  // 1. Get DB context (Installation & Repository)
  const [dbInst] = await db.select().from(installations).where(eq(installations.githubInstallationId, data.installationId));
  if (!dbInst) throw new Error(`Installation ${data.installationId} not found`);
  if (dbInst.status !== 'active') throw new Error(`Installation ${data.installationId} is ${dbInst.status}`);

  const [dbRepo] = await db.select().from(repositories).where(
    and(
      eq(repositories.githubRepoId, data.repositoryId),
      eq(repositories.installationId, dbInst.id)
    )
  );
  if (!dbRepo) throw new Error(`Repository ${data.repositoryId} not found`);
  // Allow inactive repositories to proceed (for AST only) - checked later in job
  // if (dbRepo.status !== 'active') throw new Error(`Repository ${data.repositoryFullName} is ${dbRepo.status}`);

  const limits = getPlanLimits(dbInst.planId);
  
  // Fetch user configuration
  const [owner, repo] = data.repositoryFullName.split('/');
  const gh = new GitHubClient();
  const config = await fetchConfig(gh, data.installationId, owner, repo, data.headSha);

  // Load DB-level custom configuration (API keys, custom settings)
  const [dbConfig] = await db.select().from(configs).where(eq(configs.installationId, dbInst.id));
  const hasCustomKey = !!dbConfig?.apiKeyEncrypted;

  return { dbInst, dbRepo, limits, config: config || null, hasCustomKey };
}

export async function filterAndRefineFiles(
  gh: GitHubClient,
  data: ReviewJobData,
  parsedFiles: ParsedFile[]
): Promise<ParsedFile[]> {
  const [owner, repo] = data.repositoryFullName.split('/');

  // Check for .reviewscopeignore
  let ignoredPatterns: string[] = [];
  try {
    const ignoreContent = await gh.getFileContent(data.installationId, owner, repo, '.reviewscopeignore', data.headSha);
    if (ignoreContent) {
      ignoredPatterns = ignoreContent.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));
    }
  } catch {
    // Ignore
  }

  let filteredFiles = parsedFiles;
  
  // Apply .reviewscopeignore
  if (ignoredPatterns.length > 0) {
    const isMatch = picomatch(ignoredPatterns, { dot: true });
    filteredFiles = parsedFiles.filter(f => !isMatch(f.path));
  }

  // SMART STRATEGY: Conditional Filtering
  // If we have actual logic/config files, ignore documentation and tests to save budget.
  // But if the PR is ONLY documentation/tests, we keep them.
  const hasCoreCode = filteredFiles.some(f => scoreFile(f) >= 3); // 3+ is logic/infra
  
  if (hasCoreCode) {
      // Drop Markdown/Docs and Tests if we have real code to review
      filteredFiles = filteredFiles.filter(f => {
          const isDoc = f.path.endsWith('.md') || f.path.endsWith('.markdown');
          const isTest = f.path.includes('.test.') || f.path.includes('.spec.') || f.path.includes('/tests/') || f.path.includes('__tests__/');
          return !isDoc && !isTest;
      });
  }

  return filteredFiles;
}

export async function fetchRAGContext(
  data: ReviewJobData,
  dbRepo: typeof repositories.$inferSelect,
  dbInst: typeof installations.$inferSelect,
  limits: PlanLimits,
  filteredFiles: ParsedFile[]
): Promise<string> {
  // Guard: Small PRs shouldn't hit vector search
  if (filteredFiles.length < 2) return '';
  if (!dbRepo.indexedAt || !limits.allowRAG) return '';

  try {
    const { provider } = await createConfiguredProvider(dbInst.id);
    const indexer = new RAGIndexer(provider);
    await indexer.ensureCollection();

    const retriever = new RAGRetriever(provider);
    const query = `PR: ${data.prTitle}\nFiles: ${filteredFiles.map(f => f.path).join(', ')}`;
    
    const results = await retriever.retrieve(data.repositoryId.toString(), query, limits.ragK);
    if (results.length > 0) {
      return results.map(r => `File: ${r.file}\nRelevant Snippet:\n${r.content}`).join('\n\n');
    }
  } catch (e) {
    console.warn('RAG retrieval failed:', e);
  }
  return '';
}

export async function runStaticAnalysis(
    data: ReviewJobData,
    filteredFiles: ParsedFile[],
    config: ReviewScopeConfig | null
) {
    const gh = new GitHubClient();
    const [owner, repo] = data.repositoryFullName.split('/');

    // Fetch full file contents for higher-accuracy static analysis
    // Batch fetching to avoid rate limits
    const BATCH_SIZE = 10;
    const filteredFilesWithContent = [];

    for (let i = 0; i < filteredFiles.length; i += BATCH_SIZE) {
        const batch = filteredFiles.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(batch.map(async (file) => {
            try {
                const content = await gh.getFileContent(data.installationId, owner, repo, file.path, data.headSha);
                return { ...file, content: content || undefined };
            } catch {
                return file;
            }
        }));
        filteredFilesWithContent.push(...batchResults);
    }

    const duplicateKeyViolations = filteredFiles.flatMap((file) =>
        detectDuplicateKeys(file).map((dup) => ({
          file: file.path,
          line: dup.lines[0],
          severity: 'MAJOR' as const,
          message: `Duplicate key "${dup.key}" defined multiple times. Earlier value will be ignored.`,
          ruleId: 'duplicate-object-key'
        }))
    );

    const ruleViolations = [
        ...(await runRules({ files: filteredFilesWithContent }, config || undefined)),
        ...duplicateKeyViolations
    ];

    return ruleViolations.map((v) => ({
        file: v.file,
        line: v.line,
        severity: v.severity,
        message: v.message,
        ruleId: v.ruleId
    }));
}

export async function persistResults(
    dbReviewId: string,
    _data: ReviewJobData,
    _dbRepo: typeof repositories.$inferSelect,
    aiSummary: string,
    assessment: any,
    comments: any[],
    contextHash: string,
    _existingThreads: any[],
    riskAnalysis?: string
) {
    // Combine findings (Static + AI) is done before this, we assume 'comments' contains everything ready for DB
    // But in the original code, 'dbComments' were separate.
    // We will simplify: The caller constructs the final lists.
    
    await db.update(reviews).set({
        status: 'completed',
        contextHash: contextHash,
        result: { summary: aiSummary, assessment, comments, riskAnalysis },
        processedAt: new Date(),
    }).where(eq(reviews.id, dbReviewId));
}

export function deduplicateComments(comments: any[]) {
    const seen = new Set();
    return comments.filter(c => {
        const path = c.file || c.path;
        const line = c.line;
        const message = c.message || c.body;
        
        const key = `${path}:${line}:${message}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export async function runAIReview(
  data: ReviewJobData,
  dbInst: typeof installations.$inferSelect,
  limits: PlanLimits,
  config: ReviewScopeConfig | null,
  aiReviewFiles: ParsedFile[],
  issueContext: string,
  ragContext: string,
  ruleViolations: any[]
): Promise<{ comments: ReviewComment[], summary: string, assessment: any, riskAnalysis?: string }> {
    let aiComments: ReviewComment[] = [];
    let aiSummary = '';
    let riskAnalysis: string | undefined;
    let assessment = { riskLevel: 'low', mergeReadiness: 'ready', confidence: 'high' };
    
    // Calculate Complexity
    const filesData = aiReviewFiles.map(file => ({
        path: file.path,
        additions: file.additions.map(add => add.content)
    }));
    const complexity = calculateComplexity(aiReviewFiles.length, filesData);
    
    const relatedContext = ''; // Placeholder for future expansion

    if (limits.allowAI) {
        // Team Tier Batching Logic
        if (limits.tier === PlanTier.TEAM && aiReviewFiles.length > 10) {
          const BATCH_SIZE = 10;
          const batches = [];
          for (let i = 0; i < aiReviewFiles.length; i += BATCH_SIZE) {
            batches.push(aiReviewFiles.slice(i, i + BATCH_SIZE));
          }

          const combinedComments: ReviewComment[] = [];
          let combinedSummary = '';

          let lastBatchResult: AIReviewResult | undefined;

          for (let i = 0; i < batches.length; i++) {
            const batchFiles = batches[i];
            const batchDiff = batchFiles.map(f => {
              const chunks = f.hunks.map(hunk => `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@\n${f.additions.filter(add => add.lineNumber >= hunk.newStart && add.lineNumber < hunk.newStart + hunk.newLines).map(add => `+${add.content}`).join('\n')}`).join('\n');
              return `File: ${f.path}\n${chunks}`;
            }).join('\n\n');

            const batchResult = await runEnhancedAIReview({
              installationId: dbInst.id,
              repositoryFullName: data.repositoryFullName,
              prNumber: data.prNumber,
              prTitle: data.prTitle,
              prBody: data.prBody,
              diff: batchDiff,
              issueContext: issueContext,
              relatedContext: relatedContext,
              ragContext: ragContext, // Note: RAG might be global, passed to all batches
              ruleViolations: ruleViolations.filter(v => batchFiles.some(f => f.path === v.file)), // Filter violations for this batch
              complexity: complexity,
            }, {
            model: config?.ai?.model,
            temperature: config?.ai?.temperature,
            userGuidelines: limits.allowCustomPrompts ? config?.ai?.guidelines : undefined,
            generateDetailedSummary: true, // Enable detailed PR summary generation
          });

            lastBatchResult = batchResult;

            combinedComments.push(...batchResult.comments);
            combinedSummary += `\n\n### Batch ${i + 1} Review\n${batchResult.summary}`;
            
            if (i === batches.length - 1) {
              assessment = batchResult.assessment;
              riskAnalysis = batchResult.riskAnalysis;
              // Update confidence based on RAG
              if (!ragContext) assessment.confidence = 'medium'; 
            }
          }

          aiComments = combinedComments;
          
          const finalPrSummary = lastBatchResult?.prSummary;

          // Use detailed PR summary if available, otherwise use standard summary
          if (finalPrSummary) {
            aiSummary = `### 📋 Detailed PR Summary\n${finalPrSummary.summary}\n\n**Key Points:**\n${finalPrSummary.keyPoints.map(point => `• ${point}`).join('\n')}\n\n**Complexity:** ${finalPrSummary.complexity}\n\n---\n\n### 🤝 Team Smart Batching Review\nAutomated review for ${aiReviewFiles.length} files split into ${batches.length} logical chunks.\n${combinedSummary}`;
          } else {
            aiSummary = `### 🤝 Team Smart Batching Review\nAutomated review for ${aiReviewFiles.length} files split into ${batches.length} logical chunks.\n${combinedSummary}`;
          }
        } else {
          // Standard Review (Free/Pro or Single-Batch Team)
          const fullDiff = aiReviewFiles.map(f => {
            const chunks = f.hunks.map(hunk => `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@\n${f.additions.filter(add => add.lineNumber >= hunk.newStart && add.lineNumber < hunk.newStart + hunk.newLines).map(add => `+${add.content}`).join('\n')}`).join('\n');
            return `File: ${f.path}\n${chunks}`;
          }).join('\n\n');

          const aiResult = await runEnhancedAIReview({
            installationId: dbInst.id,
            repositoryFullName: data.repositoryFullName,
            prNumber: data.prNumber,
            prTitle: data.prTitle,
            prBody: data.prBody,
            diff: fullDiff,
            issueContext: issueContext,
            relatedContext: relatedContext,
            ragContext: ragContext,
            ruleViolations: ruleViolations,
            complexity: complexity,
          }, {
            model: config?.ai?.model,
            temperature: config?.ai?.temperature,
            userGuidelines: limits.allowCustomPrompts ? config?.ai?.guidelines : undefined,
            generateDetailedSummary: true, // Enable detailed PR summary generation
          });

          aiComments = aiResult.comments;
          
          // Use detailed PR summary if available, otherwise use standard summary
          if (aiResult.prSummary) {
            aiSummary = `### 📋 Detailed PR Summary\n${aiResult.prSummary.summary}\n\n**Key Points:**\n${aiResult.prSummary.keyPoints.map(point => `• ${point}`).join('\n')}\n\n**Complexity:** ${aiResult.prSummary.complexity}\n\n---\n\n### 🔍 Code Review\n${aiResult.summary}`;
          } else {
            aiSummary = aiResult.summary;
          }
          
          assessment = aiResult.assessment;
          riskAnalysis = aiResult.riskAnalysis;
          
          // Context Confidence Logic
          // High: RAG provided + Issues Provided
          // Medium: Only one source or neither but small PR
          // Low: No context on complex PR
          if (!ragContext && limits.allowRAG) {
              assessment.confidence = 'medium';
          }
        }
    } else {
        aiSummary = 'AI Review disabled for this plan.';
    }

    return { comments: aiComments, summary: aiSummary, assessment, riskAnalysis };
}

export async function postToGitHub(
    gh: GitHubClient,
    data: ReviewJobData,
    summary: string,
    comments: ReviewComment[],
    config: ReviewScopeConfig | null
) {
    if (config?.github?.post_comments === false) return;

    const [owner, repo] = data.repositoryFullName.split('/');
    const botName = 'review-scope[bot]'; 

    // 1. Construct a professional summary
    let richSummary = `## ReviewScope Analysis\n\n${summary}`;
    richSummary += `\n\n---\n_Generated by [ReviewScope](https://reviewscope.com) — Senior AI Code Reviewer_`;

    // 2. Fetch open threads to see what we can resolve
    const openThreads = await gh.getOpenReviewThreads(data.installationId, owner, repo, data.prNumber);
    const botThreads = openThreads.filter((t: any) => 
        t.comments.nodes[0]?.author?.login === botName
    );

    // 3. Determine which threads are now resolved
    for (const thread of botThreads) {
        const firstComment = thread.comments.nodes[0];
        const isStillIssue = comments.some(c => 
            c.file === firstComment.path && 
            (c.line === firstComment.line || c.endLine === firstComment.line)
        );

        if (!isStillIssue) {
            try {
                await gh.resolveReviewThread(data.installationId, thread.id);
                console.warn(`[GitHub] Resolved fixed thread ${thread.id} at ${firstComment.path}:${firstComment.line}`);
            } catch (err) {
                console.error(`[GitHub] Failed to resolve thread ${thread.id}`, err);
            }
        }
    }

    // 4. Filter comments that have already been posted to avoid noise
    const allExistingComments = await gh.getReviewComments(data.installationId, owner, repo, data.prNumber);
    const existingBotComments = allExistingComments.filter(c => c.user?.login === botName);
    
    const newComments = comments.filter(comment => {
        return !existingBotComments.some(ec => 
            ec.path === comment.file && 
            (ec.line === comment.line || ec.line === comment.endLine) && 
            (ec.body.includes(comment.message) || (comment.why && ec.body.includes(comment.why)))
        );
    });

    // Also deduplicate internally (in case AI generated duplicates)
    const uniqueNewComments = deduplicateComments(newComments);

    if (uniqueNewComments.length === 0 && !summary) {
        console.info('No new comments or summary to post.');
        return;
    }

    try {
        await gh.postReview(
            data.installationId, 
            owner, 
            repo, 
            data.prNumber,
            data.headSha,
            richSummary,
            uniqueNewComments.map(c => {
                const severityLabel = c.severity.toLowerCase();
                
                let body = `**${severityLabel}**\n${c.why || c.message}\n\n`;
                
                if (c.suggestion || c.diff) {
                    body += `**Suggested change**\n`;
                    if (c.suggestion) {
                        body += `\`\`\`suggestion\n${c.suggestion}\n\`\`\`\n\n`;
                    } else if (c.diff) {
                        body += `\`\`\`diff\n${c.diff}\n\`\`\`\n\n`;
                    }
                }

                return {
                    path: c.file,
                    line: c.endLine || c.line,
                    start_line: c.endLine ? c.line : undefined,
                    body: body.trim()
                };
            })
        );
    } catch (err) {
        console.error(`Failed to post review to ${owner}/${repo}#${data.prNumber}`, err);
    }
}
