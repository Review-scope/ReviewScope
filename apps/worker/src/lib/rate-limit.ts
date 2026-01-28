
import { db, apiUsageLogs } from '../../../api/src/db/index.js';
import { eq, and, gt, asc } from 'drizzle-orm';
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
  commitSha: string,
  limits: PlanLimits
) {
  const prQuery = `pr:${prNumber}:${commitSha}`;
  const service = 'review-run';

  // 1. Check if this commit was already reviewed (Idempotency / Free re-run)
  const [existingRun] = await db
    .select()
    .from(apiUsageLogs)
    .where(and(
      eq(apiUsageLogs.repositoryId, repositoryId),
      eq(apiUsageLogs.apiService, service),
      eq(apiUsageLogs.query, prQuery)
    ))
    .limit(1);

  if (existingRun) {
    // Already counted this commit. Allow free re-run.
    return;
  }
  
  // 3. Check Installation Monthly Limit (Fixed Cycle Anchored to First Review)
  if (limits.monthlyReviewsLimit < Infinity) {
    // Find the very first review ever to anchor the billing cycle
    const [firstLog] = await db
      .select({ createdAt: apiUsageLogs.createdAt })
      .from(apiUsageLogs)
      .where(and(
        eq(apiUsageLogs.installationId, installationId),
        eq(apiUsageLogs.apiService, service)
      ))
      .orderBy(asc(apiUsageLogs.createdAt))
      .limit(1);

    let currentCycleStart = new Date(); // Default to now if no history (new cycle starts today)
    let nextCycleStart = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (firstLog) {
       const cycleLength = 30 * 24 * 60 * 60 * 1000;
       const firstReviewDate = firstLog.createdAt.getTime();
       const now = Date.now();
       
       const cyclesElapsed = Math.floor((now - firstReviewDate) / cycleLength);
       const currentCycleStartTime = firstReviewDate + (cyclesElapsed * cycleLength);
       
       currentCycleStart = new Date(currentCycleStartTime);
       nextCycleStart = new Date(currentCycleStartTime + cycleLength);
    }

    // Count unique PR+SHA reviewed in the current cycle
    const usage = await db
      .select({ 
        repositoryId: apiUsageLogs.repositoryId,
        query: apiUsageLogs.query 
      })
      .from(apiUsageLogs)
      .where(and(
        eq(apiUsageLogs.installationId, installationId),
        eq(apiUsageLogs.apiService, service),
        gt(apiUsageLogs.createdAt, currentCycleStart)
      ))
      .groupBy(apiUsageLogs.repositoryId, apiUsageLogs.query);

    if (usage.length >= limits.monthlyReviewsLimit) {
        throw new RateLimitError(
          `Monthly review limit reached (${limits.monthlyReviewsLimit} reviews). Resets on ${nextCycleStart.toLocaleDateString()}.`,
          nextCycleStart
        );
    }
  }
}

export async function logReviewUsage(
  installationId: string,
  repositoryId: string,
  prNumber: number,
  commitSha: string
) {
  // Check if already logged to avoid duplicates (although checkRateLimits handles this check, concurrent requests might race)
  const query = `pr:${prNumber}:${commitSha}`;
  const service = 'review-run';
  
  const [existing] = await db
    .select()
    .from(apiUsageLogs)
    .where(and(
      eq(apiUsageLogs.installationId, installationId),
      eq(apiUsageLogs.repositoryId, repositoryId),
      eq(apiUsageLogs.apiService, service),
      eq(apiUsageLogs.query, query)
    ))
    .limit(1);
    
  if (existing) return;

  await db.insert(apiUsageLogs).values({
    installationId,
    repositoryId,
    apiService: service,
    query: query,
    tokensUsed: 0, // Placeholder
  });
}
