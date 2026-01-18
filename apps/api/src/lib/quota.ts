import { db, installations, repositories } from '../db/index.js';
import { eq, and } from 'drizzle-orm';

// Plan limits (duplicated from worker/src/lib/plans.ts to avoid cross-app imports in Next.js)
const PLAN_LIMITS: { [key: string]: { maxRepos: number } } = {
  Free: { maxRepos: 3 },
  Pro: { maxRepos: 5 },
  Team: { maxRepos: 999999 }
};

function getPlanLimits(planName: string | null) {
  return PLAN_LIMITS[planName || 'Free'] || PLAN_LIMITS.Free;
}

export class QuotaError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 402, code = 'REPO_LIMIT') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Assert that the installation has not exceeded the max repos for its plan.
 * Throws QuotaError if limit reached.
 */
export async function assertRepoQuotaByInstallationId(installationId: string) {
  const [inst] = await db.select().from(installations).where(eq(installations.id, installationId));
  if (!inst) {
    throw new QuotaError('Installation not found', 404, 'INSTALLATION_NOT_FOUND');
  }

  const limits = getPlanLimits(inst.planName ?? null);

  // Count active repos
  const activeRepos = await db
    .select()
    .from(repositories)
    .where(and(eq(repositories.installationId, installationId), eq(repositories.status, 'active')));

  if (activeRepos.length >= limits.maxRepos) {
    throw new QuotaError(
      `Repository limit reached for ${inst.planName || 'Free'} plan. Max ${limits.maxRepos} repos allowed.`,
      402,
      'REPO_LIMIT'
    );
  }
}

/**
 * Assert repo quota using GitHub installation id (numeric) by resolving to internal installation id.
 */
export async function assertRepoQuotaByGithubInstallationId(githubInstallationId: number) {
  const [inst] = await db
    .select()
    .from(installations)
    .where(eq(installations.githubInstallationId, githubInstallationId));
  if (!inst) {
    throw new QuotaError('Installation not found', 404, 'INSTALLATION_NOT_FOUND');
  }
  await assertRepoQuotaByInstallationId(inst.id);
}

export async function getRepoQuotaByInstallationId(installationId: string) {
  const [inst] = await db.select().from(installations).where(eq(installations.id, installationId));
  if (!inst) {
    throw new QuotaError('Installation not found', 404, 'INSTALLATION_NOT_FOUND');
  }

  const limits = getPlanLimits(inst.planName ?? null);
  const activeRepos = await db
    .select()
    .from(repositories)
    .where(and(eq(repositories.installationId, installationId), eq(repositories.status, 'active')));

  const usedRepos = activeRepos.length;
  const remaining = Math.max(0, limits.maxRepos - usedRepos);

  return {
    installationId: inst.id,
    githubInstallationId: inst.githubInstallationId,
    planId: inst.planId ?? 0,
    planName: inst.planName ?? 'Free',
    expiresAt: inst.expiresAt ?? null,
    maxRepos: limits.maxRepos,
    usedRepos,
    remaining,
  };
}

export async function getRepoQuotaByGithubInstallationId(githubInstallationId: number) {
  const [inst] = await db
    .select()
    .from(installations)
    .where(eq(installations.githubInstallationId, githubInstallationId));
  if (!inst) {
    throw new QuotaError('Installation not found', 404, 'INSTALLATION_NOT_FOUND');
  }
  return getRepoQuotaByInstallationId(inst.id);
}
