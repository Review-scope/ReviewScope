
import { db, apiUsageLogs } from '../../../api/src/db/index.js';
import { eq, and, gt, desc, sql } from 'drizzle-orm';
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

  // 2. Check Max Reviews per PR
  const [prCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(apiUsageLogs)
    .where(and(
      eq(apiUsageLogs.repositoryId, repositoryId),
      eq(apiUsageLogs.apiService, service),
      eq(apiUsageLogs.query, prQuery)
    ));

  if (Number(prCount.count) >= limits.reviewsPerPR) {
    throw new RateLimitError(
      `Max reviews reached for PR #${prNumber} (${limits.reviewsPerPR} limit). Upgrade your plan for more.`
    );
  }

  // 3. Check Installation Daily Limit
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  // To calculate reset time accurately, we need the Nth oldest record in the window
  const dailyLogs = await db
    .select({ createdAt: apiUsageLogs.createdAt })
    .from(apiUsageLogs)
    .where(and(
      eq(apiUsageLogs.installationId, installationId),
      eq(apiUsageLogs.apiService, service),
      gt(apiUsageLogs.createdAt, oneDayAgo)
    ))
    .orderBy(desc(apiUsageLogs.createdAt));

  if (dailyLogs.length >= limits.dailyReviewsLimit) {
    // The slot opens when the oldest record in the window expires
    // dailyLogs is sorted DESC (newest first). 
    // The record that is "holding" the last slot is the one at index (limit - 1)
    // Actually, if we have N records, the one that needs to expire to make room for 1 new one 
    // is the one at index (limit - 1) if we currently have exactly limit records?
    // No, if we have 'limit' records, we are full. 
    // We can add a new one when the *oldest* of those 'limit' records is > 24h old.
    // The oldest of the relevant records is the last one in the list (since we fetched > oneDayAgo).
    // But technically, the one that defines the "window edge" for the Nth slot is the (Nth) record.
    
    // Example: Limit 3. Logs: [10:00, 09:00, 08:00]. Now is 12:00.
    // Window starts at 12:00 yesterday.
    // We can add a review when 08:00 becomes > 24h old.
    // So resetAt = 08:00 + 24h.
    
    const oldestRelevantLog = dailyLogs[limits.dailyReviewsLimit - 1]; // Get the Nth log
    const resetAt = new Date(oldestRelevantLog.createdAt.getTime() + 24 * 60 * 60 * 1000);
    
    // Add a small buffer (e.g. 1 minute) to ensure we are safely past the window
    resetAt.setMinutes(resetAt.getMinutes() + 1);

    throw new RateLimitError(
      `Daily review limit reached for this installation (${limits.dailyReviewsLimit}/day). Limit resets at ${resetAt.toISOString()}.`,
      resetAt
    );
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
