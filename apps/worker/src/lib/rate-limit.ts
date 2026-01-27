
import { db, apiUsageLogs } from '../../../api/src/db/index.js';
import { eq, and, gt, desc } from 'drizzle-orm';
import { PlanLimits } from './plans.js';

export class RateLimitError extends Error {
  resetAt?: Date;

  constructor(message: string, resetAt?: Date) {
    super(message);
    this.name = 'RateLimitError';
    this.resetAt = resetAt;
  }
}

export async function checkRateLimits(
  installationId: string,
  repositoryId: string,
  prNumber: number,
  limits: PlanLimits
) {
  const prQuery = `pr:${prNumber}`;
  const service = 'review-run';

  // 1. Check Cooldown (Most recent review run for this PR)
  const [lastRun] = await db
    .select()
    .from(apiUsageLogs)
    .where(and(
      eq(apiUsageLogs.repositoryId, repositoryId),
      eq(apiUsageLogs.apiService, service),
      eq(apiUsageLogs.query, prQuery)
    ))
    .orderBy(desc(apiUsageLogs.createdAt))
    .limit(1);

  if (lastRun) {
    const timeSinceLastRun = Date.now() - lastRun.createdAt.getTime();
    const cooldownMs = limits.cooldownMinutes * 60 * 1000;
    
    if (timeSinceLastRun < cooldownMs) {
      const resetAt = new Date(lastRun.createdAt.getTime() + cooldownMs);
      const minutesLeft = Math.ceil((cooldownMs - timeSinceLastRun) / 60000);
      throw new RateLimitError(
        `Review cooldown active. Please wait ${minutesLeft} minutes before requesting another review for PR #${prNumber}.`,
        resetAt
      );
    }
  }

  // 2. Check Installation Monthly Limit (rolling 30-day window)
  if (limits.monthlyReviewsLimit < Infinity) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Count unique PRs reviewed in the last 30 days
    // We group by repositoryId and query (pr:{number}) to count each PR only once
    const usage = await db
      .select({ 
        repositoryId: apiUsageLogs.repositoryId,
        query: apiUsageLogs.query 
      })
      .from(apiUsageLogs)
      .where(and(
        eq(apiUsageLogs.installationId, installationId),
        eq(apiUsageLogs.apiService, service),
        gt(apiUsageLogs.createdAt, thirtyDaysAgo)
      ))
      .groupBy(apiUsageLogs.repositoryId, apiUsageLogs.query);

    if (usage.length >= limits.monthlyReviewsLimit) {
      // Check if the current PR is already in the usage list (re-review of an active PR)
      const isCurrentPrAlreadyCounted = usage.some(
        u => u.repositoryId === repositoryId && u.query === prQuery
      );

      if (!isCurrentPrAlreadyCounted) {
        const resetAt = new Date(Date.now() + 24 * 60 * 60 * 1000); 
        
        throw new RateLimitError(
          `Monthly review limit reached (${limits.monthlyReviewsLimit} PRs). Upgrade to Pro for unlimited reviews.`,
          resetAt
        );
      }
    }
  }
}

export async function logReviewUsage(
  installationId: string,
  repositoryId: string,
  prNumber: number
) {
  await db.insert(apiUsageLogs).values({
    installationId,
    repositoryId,
    apiService: 'review-run',
    query: `pr:${prNumber}`,
    tokensUsed: 0, // Placeholder
  });
}
