'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '../../app/api/auth/[...nextauth]/route';
import { db, repositories, installations } from '@/lib/db';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getPlanLimits } from '../../../../worker/src/lib/plans';
import { getUserOrgIds } from '../github';

export async function toggleRepoActivation(repoId: string, isActive: boolean) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  // @ts-expect-error session.accessToken exists
  const accessToken = session.accessToken;
  // @ts-expect-error session.user.id
  const githubUserId = parseInt(session.user.id);

  const orgIds = accessToken ? await getUserOrgIds(accessToken) : [];
  const allAccountIds = [githubUserId, ...orgIds];

  // Get Repo and Installation
  const [repo] = await db
    .select({
      id: repositories.id,
      installationId: repositories.installationId,
      isActive: repositories.isActive,
      fullName: repositories.fullName,
    })
    .from(repositories)
    .where(eq(repositories.id, repoId));

  if (!repo) {
    return { success: false, error: 'Repository not found' };
  }

  const [installation] = await db
    .select()
    .from(installations)
    .where(
      and(
        eq(installations.id, repo.installationId),
        inArray(installations.githubAccountId, allAccountIds)
      )
    );

  if (!installation) {
    return { success: false, error: 'Installation access denied' };
  }

  // If already in desired state, return success
  if (repo.isActive === isActive) {
    return { success: true };
  }

  // LOGIC: Deactivation is always free
  if (!isActive) {
    await db
      .update(repositories)
      .set({ isActive: false })
      .where(eq(repositories.id, repoId));
      
    revalidatePath('/dashboard');
    revalidatePath(`/repositories/${repoId}`);
    return { success: true };
  }

  // LOGIC: Activation requires checks
  const limits = getPlanLimits(installation.planId);
  
  // 1. Check Active Repo Limit
  const activeRepos = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(repositories)
    .where(
      and(
        eq(repositories.installationId, installation.id),
        eq(repositories.isActive, true)
      )
    );
  
  const currentActive = activeRepos[0].count;

  if (currentActive >= limits.maxRepos) {
    return { 
      success: false, 
      error: `Plan limit reached. Your ${limits.tier} plan allows ${limits.maxRepos} active repositories.` 
    };
  }

  // 2. Check Monthly Swap/Activation Limit
  // Reset logic: If lastSwapReset is more than 30 days ago, reset count
  const now = new Date();
  const lastReset = installation.lastSwapReset ? new Date(installation.lastSwapReset) : new Date(0);
  const diffTime = Math.abs(now.getTime() - lastReset.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

  let currentSwapCount = installation.swapCount;

  if (diffDays > 30) {
    // Reset needed
    await db
      .update(installations)
      .set({ swapCount: 0, lastSwapReset: now })
      .where(eq(installations.id, installation.id));
    currentSwapCount = 0;
  }

  if (currentSwapCount >= limits.maxMonthlyActivations) {
     return { 
      success: false, 
      error: `Monthly activation limit reached. Your ${limits.tier} plan allows ${limits.maxMonthlyActivations} activations per month.` 
    };
  }

  // 3. Activate
  await db.transaction(async (tx) => {
    await tx
      .update(repositories)
      .set({ isActive: true })
      .where(eq(repositories.id, repoId));
      
    await tx
      .update(installations)
      .set({ swapCount: sql`${installations.swapCount} + 1` })
      .where(eq(installations.id, installation.id));
  });

  // 4. Trigger Indexing Worker
  try {
    const apiUrl = process.env.INTERNAL_API_URL || 'http://localhost:3001';
    await fetch(`${apiUrl}/api/v1/jobs/index/${repoId}`, {
      method: 'POST',
    });
  } catch (err) {
    console.error('Failed to trigger indexing worker:', err);
    // We don't fail the activation if the worker trigger fails, 
    // but the user might notice the worker didn't start.
  }

  revalidatePath('/dashboard');
  revalidatePath(`/repositories/${repoId}`);
  
  return { success: true };
}
