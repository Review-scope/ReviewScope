/* eslint-disable no-console */
import { GitHubClient } from '../lib/github.js';
import { parseDiff } from '../lib/parser.js';
import { db, reviews } from '../../../api/src/db/index.js';
import { eq, and } from 'drizzle-orm';
import { PlanTier } from '../lib/plans.js';
import { checkRateLimits, logReviewUsage, RateLimitError } from '../lib/rate-limit.js';
import { Queue, Job } from 'bullmq';
import { createHash } from 'crypto';

import { ReviewComment } from '@reviewscope/llm-core';
import { 
  validateJob, 
  filterAndRefineFiles, 
  fetchRAGContext, 
  runStaticAnalysis, 
  persistResults, 
  deduplicateComments,
  postToGitHub,
  getIssueContext,
  runAIReview
} from '../lib/review-lifecycle.js';
import { sortAndLimitFiles } from '../lib/scoring.js';

let reviewQueue: Queue | null = null;
const getReviewQueue = () => {
  if (!reviewQueue) {
    const redisUrl = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
    reviewQueue = new Queue('review-jobs', {
      connection: {
        host: redisUrl.hostname,
        port: Number(redisUrl.port),
        password: redisUrl.password,
        tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
      },
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 }
      }
    });
  }
  return reviewQueue;
};

export interface ReviewJobData {
  jobVersion: 1;
  installationId: number;
  repositoryId: number;
  repositoryFullName: string;
  prNumber: number;
  prTitle: string;
  prBody: string;
  headSha: string;
  baseSha: string;
  deliveryId: string;
}

export interface ReviewResult {
  success: boolean;
  reviewerVersion: string;
  contextHash: string;
  comments: ReviewComment[];
  summary: string;
}

export async function processReviewJob(data: ReviewJobData, _job?: Job): Promise<ReviewResult> {
  console.warn(`[Worker] Started processing review for PR #${data.prNumber} in ${data.repositoryFullName}`);
  
  let dbReviewId: string | null = null;

  try {
    // ---------------------------------------------------------
    // 1. Validation & Setup (Modular)
    // ---------------------------------------------------------
    const jobContext = await validateJob(data);
    const { dbInst, dbRepo, limits, config } = jobContext;

    // RATE LIMIT CHECK
    try {
        await checkRateLimits(dbInst.id, dbRepo.id, data.prNumber, data.headSha, limits);
    } catch (e) {
        if (e instanceof RateLimitError) {
             console.warn(`[Limit] ${e.message}`);

             let userMessage = e.message;
             let summaryPrefix = '🚫 Review Skipped';

             // Handle Auto-Requeue if reset time is provided
             if (e.resetAt) {
                 const delay = e.resetAt.getTime() - Date.now();
                 // Ensure delay is positive and reasonable (e.g. max 2 days)
                 if (delay > 0 && delay < 48 * 60 * 60 * 1000) {
                      try {
                          const queue = getReviewQueue();
                          await queue.add('retry-review', data, { 
                              delay,
                              jobId: `retry-${data.installationId}-${data.prNumber}-${e.resetAt.getTime()}` // Dedup
                          });
                          
                          const resetTimeStr = e.resetAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
                          userMessage = `${e.message}\n\n**Good news!** We've queued this review to run automatically at **${resetTimeStr}**.`;
                          summaryPrefix = '⏳ Review Queued';
                      } catch (qError) {
                          console.error('[Worker] Failed to queue retry job', qError);
                      }
                 }
             }

             // Create record to notify user
             await db.insert(reviews).values({
                 repositoryId: dbRepo.id,
                 prNumber: data.prNumber,
                 status: 'completed',
                 reviewerVersion: '0.0.1',
                 deliveryId: data.deliveryId,
                 result: { summary: `${summaryPrefix}\n\n${userMessage}`, comments: [] },
                 processedAt: new Date(),
             }).onConflictDoUpdate({
                target: [reviews.repositoryId, reviews.prNumber],
                set: {
                    status: 'completed',
                    deliveryId: data.deliveryId,
                    result: { summary: `${summaryPrefix}\n\n${userMessage}`, comments: [] },
                    updatedAt: new Date(), 
                },
             }).returning();

             // Notify user on GitHub
             try {
                const ghClient = new GitHubClient();
                const [owner, repo] = data.repositoryFullName.split('/');
                await ghClient.postComment(
                    data.installationId,
                    owner,
                    repo,
                    data.prNumber,
                    `## ${summaryPrefix}\n\n${userMessage}`
                );
             } catch (notifyErr) {
                 console.error('[Worker] Failed to post limit comment:', notifyErr);
             }
             
             return { success: false, reviewerVersion: '0.0.1', contextHash: '', comments: [], summary: userMessage };
        }
        throw e;
    }

    // Create DB Review Record
    const [insertedReview] = await db.insert(reviews).values({
      repositoryId: dbRepo.id,
      prNumber: data.prNumber,
      status: 'pending', // Mark as pending
      reviewerVersion: '0.0.1',
      deliveryId: data.deliveryId,
      result: { summary: 'Review in progress...', comments: [] },
      createdAt: new Date(),
      updatedAt: new Date(), 
    }).onConflictDoUpdate({
      target: [reviews.repositoryId, reviews.prNumber],
      set: {
        status: 'pending',
        deliveryId: data.deliveryId,
        updatedAt: new Date(), 
      },
    }).returning();
    
    dbReviewId = insertedReview.id;

    // COMPLIANCE Check Removed: Free tier now works on Organization accounts

    const gh = new GitHubClient();
    const [owner, repo] = data.repositoryFullName.split('/');

    // ---------------------------------------------------------
    // 2. File Parsing & Filtering (Modular)
    // ---------------------------------------------------------
    const diffText = await gh.getPullRequestDiff(data.installationId, owner, repo, data.prNumber);
    const parsedFiles = parseDiff(diffText);

    // Filter and Refine
    const filteredFiles = await filterAndRefineFiles(gh, data, parsedFiles);

    // AI Review Guardrail: Skip if diff is tiny
    // If we have very few changes, skip AI to save cost and avoid hallucinations
    const totalAdditions = filteredFiles.reduce((sum, f) => sum + f.additions.length, 0);
    const totalDeletions = filteredFiles.reduce((sum, f) => sum + f.deletions.length, 0);
    if ((totalAdditions + totalDeletions) < 10 && filteredFiles.length === 1 && limits.tier === PlanTier.FREE) {
         console.info('[Worker] Skipping AI for tiny diff (Free Tier optimization)');
         // We still run static analysis though? 
         // For now, let's just proceed, but maybe we can return early if it's REALLY empty.
    }
    
    // Check for previous identical run (Optimization)
    // Hash the *filtered* file content/diffs to see if anything substantial changed
    const currentHash = createHash('sha256')
      .update(data.headSha)
      .update(JSON.stringify(filteredFiles.map(f => ({ p: f.path, h: f.additions.map(c => c.content).join('') }))))
      .update('v1') // Version bump if logic changes
      .digest('hex');

    const [existingReview] = await db.select().from(reviews).where(
      and(
        eq(reviews.repositoryId, dbRepo.id),
        eq(reviews.prNumber, data.prNumber),
        eq(reviews.contextHash, currentHash),
        eq(reviews.status, 'completed')
      )
    );

    if (existingReview && !config?.ai?.force_review) {
        console.info(`[Worker] Skipping duplicate review for ${data.repositoryFullName}#${data.prNumber}`);
        return { 
            success: true, 
            reviewerVersion: '0.0.1', 
            contextHash: currentHash, 
            comments: [], 
            summary: (existingReview.result as any).summary || 'Review reused from previous identical run.',
        };
    }

    // Phase 2b - Scoring and Limiting (LLM Context Budgeting)
    // Limits removed, but we still sort by priority (default cap is 1000 in sortAndLimitFiles)
    const aiReviewFiles = sortAndLimitFiles(filteredFiles);
    // const skippedFilesCount = Math.max(0, filteredFiles.length - aiReviewFiles.length); // Unused

    if (filteredFiles.length === 0 || aiReviewFiles.length === 0) {
      console.warn('Skipping logic: No relevant file changes found for AI.');
      await db.update(reviews).set({
          status: 'completed',
          contextHash: 'filtered-empty',
          result: { summary: 'Skipped: No relevant code changes to review.', comments: [] },
          processedAt: new Date(),
      }).where(eq(reviews.id, dbReviewId));
      return { success: true, reviewerVersion: '0.0.1', contextHash: '', comments: [], summary: 'No relevant changes.' };
    }

    // ---------------------------------------------------------
    // 3. Static Analysis (Modular)
    // ---------------------------------------------------------
    const ruleViolations = await runStaticAnalysis(data, aiReviewFiles, config);

    // ---------------------------------------------------------
    // 4. Context Fetching (Modular)
    // ---------------------------------------------------------
    const issueContext = await getIssueContext(gh, data);
    const ragContext = await fetchRAGContext(data, dbRepo, dbInst, limits, aiReviewFiles);
    // const relatedContext = ''; // Placeholder

    // ---------------------------------------------------------
    // 5. AI Review
    // ---------------------------------------------------------
    let aiComments: ReviewComment[] = [];
    let aiSummary = '';
    let riskAnalysis: string | undefined;
    let assessment = { riskLevel: 'low', mergeReadiness: 'ready', confidence: 'high' as 'high' | 'medium' | 'low' };
    const contextHash = currentHash;
    let skipReason = '';
    let aiError: Error | null = null;

    // AI Review Guardrail: Skip if diff is tiny (User Request)
    const optimizedDiffLength = aiReviewFiles.reduce((sum, f) => sum + f.additions.map(add => add.content.length).reduce((cSum, c) => cSum + c, 0), 0);
    
    // Check repository active status
    const isRepoActive = dbRepo.status === 'active';

    if (optimizedDiffLength < 50) {
        skipReason = 'Change too small for meaningful AI review';
    } else if (aiReviewFiles.length === 1 && optimizedDiffLength < 200 && limits.tier === PlanTier.FREE) {
        skipReason = 'Tiny diff (Free Tier optimization)';
    } else if (!isRepoActive) {
        skipReason = 'Repository is not active (AST only)';
    }

    if (limits.allowAI && !skipReason) {
        try {
            const aiResult = await runAIReview(
                data,
                dbInst,
                limits,
                config,
                aiReviewFiles,
                issueContext,
                ragContext,
                ruleViolations
            );
            aiComments = aiResult.comments;
            aiSummary = aiResult.summary;
            assessment = aiResult.assessment;
            riskAnalysis = aiResult.riskAnalysis;
        } catch (e: any) {
            aiError = e instanceof Error ? e : new Error(String(e));
            console.error('[Worker] AI review failed, continuing with static analysis only:', aiError.message || aiError.toString());
        }
    } else {
        aiSummary = skipReason ? `AI Review skipped: ${skipReason}` : 'AI Review disabled for this plan.';
    }

    if (aiError) {
        const message = aiError.message || 'AI review failed';
        aiSummary = `Static analysis only. AI review could not run: ${message}`;
    }

    // ---------------------------------------------------------
    // 6. Deduplication & Persistence (Modular)
    // ---------------------------------------------------------
    // Merge Static Analysis with AI Comments
    const allComments = [...ruleViolations, ...aiComments];
    
    // Deduplicate
    const finalComments = deduplicateComments(allComments);

    // Persist
    await persistResults(
        dbReviewId, 
        data, 
        dbRepo, 
        aiSummary, 
        assessment, 
        finalComments, 
        contextHash, 
        [], // existingThreads not used currently
        riskAnalysis
    );
    
    // Update usage stats
    await logReviewUsage(dbInst.id, dbRepo.id, data.prNumber, data.headSha);

    // Post to GitHub (Modular)
    await postToGitHub(gh, data, aiSummary, finalComments, config);

    console.warn(`[Worker] Review completed for PR #${data.prNumber}`);
    return { success: true, reviewerVersion: '0.0.1', contextHash, comments: finalComments, summary: aiSummary };

  } catch (error: any) {
    console.error('[Worker] Job failed:', error);
    if (dbReviewId) {
        await db.update(reviews).set({
            status: 'failed',
            result: { summary: `Review failed: ${error.message}`, comments: [] },
            processedAt: new Date(),
        }).where(eq(reviews.id, dbReviewId));
    }

    // Notify user on final failure
    try {
        const currentAttempt = _job?.attemptsMade || 0;
        const maxAttempts = _job?.opts.attempts || 3;

        // If this is the last attempt (or if job info is missing, assume it's critical)
        if (currentAttempt >= maxAttempts - 1) {
            const gh = new GitHubClient();
            const [owner, repo] = data.repositoryFullName.split('/');
            const errorMessage = error instanceof Error ? error.message : String(error);
            const failureBody = `## ❌ Review Failed\n\nReviewScope encountered an error while processing this PR:\n\n> ${errorMessage}\n\nWe have logged this issue and will investigate. Please try again later or contact support.`;
            
            await gh.postComment(data.installationId, owner, repo, data.prNumber, failureBody);
        }
    } catch (notifyError) {
        console.error('[Worker] Failed to notify user of failure:', notifyError);
    }

    throw error;
  }
}
