'use server';

import { db, repositories, installations } from "@/lib/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Queue } from "bullmq";
import { QdrantClient } from "@qdrant/js-client-rest";
import Redis from "ioredis";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/authOptions";

// Admin GitHub IDs - restricted access
const ADMIN_GITHUB_IDS = [
  '134628559', // paras-verma7454
];

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  // @ts-expect-error session.user.id
  const userId = session?.user?.id;
  
  if (!session?.user || !ADMIN_GITHUB_IDS.includes(userId)) {
    throw new Error("Unauthorized: Admin access required");
  }
}

// Redis connection for BullMQ
function getRedisConnection() {
  const redisUrl = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port),
    password: redisUrl.password || undefined,
    tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

// Redis client for settings
function getRedisClient() {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
  });
  
  redis.on('error', (err) => {
    console.error('[Admin] Redis Client Error:', err.message);
  });
  
  return redis;
}

// Qdrant client
function getQdrantClient() {
  const url = process.env.QDRANT_URL;
  const apiKey = process.env.QDRANT_API_KEY;
  if (!url) {
    throw new Error('QDRANT_URL not defined');
  }
  return new QdrantClient({ url, apiKey });
}

const COLLECTION_NAME = 'reviewscope_repos';

// Indexing queue
let indexingQueue: Queue | null = null;
function getIndexingQueue() {
  if (!indexingQueue) {
    indexingQueue = new Queue('indexing-jobs', {
      connection: getRedisConnection(),
    });
  }
  return indexingQueue;
}

export async function reindexInstallation(installationId: string) {
  await requireAdmin();
  console.log(`[Admin] Reindex requested for installation: ${installationId}`);
  
  // Get the installation
  const [installation] = await db.select().from(installations).where(eq(installations.id, installationId));
  if (!installation) {
    return { success: false, error: 'Installation not found' };
  }

  // Get all repos for this installation
  const repos = await db.select().from(repositories).where(eq(repositories.installationId, installationId));
  
  // Reset indexedAt and enqueue indexing jobs in parallel
  const queue = getIndexingQueue();
  
  await Promise.all(repos.map(async (repo) => {
    await db.update(repositories).set({
      indexedAt: null,
    }).where(eq(repositories.id, repo.id));

    // Enqueue indexing job
    await queue.add(`index-${repo.fullName}`, {
      installationId: installation.githubInstallationId,
      repositoryId: repo.githubRepoId,
      repositoryFullName: repo.fullName,
    });
    console.log(`[Admin] Enqueued indexing job for ${repo.fullName}`);
  }));
  
  revalidatePath('/admin');
  return { success: true, reposCount: repos.length };
}

export async function disableInstallation(installationId: string) {
  await requireAdmin();
  console.log(`[Admin] Disable requested for installation: ${installationId}`);
  
  // Get the installation
  const [installation] = await db.select().from(installations).where(eq(installations.id, installationId));
  if (!installation) {
    return { success: false, error: 'Installation not found' };
  }

  // Get all repos for this installation
  const repos = await db.select().from(repositories).where(eq(repositories.installationId, installationId));

  // Clear vectors for all repos
  try {
    const qdrant = getQdrantClient();
    // Delete in parallel
    await Promise.all(repos.map(repo => 
      qdrant.delete(COLLECTION_NAME, {
        filter: {
          must: [
            { key: 'repoId', match: { value: repo.githubRepoId } }
          ]
        }
      })
    ));
    console.log(`[Admin] Cleared vectors for ${repos.length} repos`);
  } catch (error) {
    console.error(`[Admin] Failed to clear vectors:`, error);
  }

  // Delete all repos (cascades from schema)
  // We can do this in parallel too, though DB might lock. Sequential delete for DB safety is often fine, 
  // but let's assume parallel is okay for these unrelated rows or use a batch delete if Drizzle supports it.
  // For safety/simplicity in this fix, we'll keep the loop or use Promise.all.
  await Promise.all(repos.map(repo => 
    db.delete(repositories).where(eq(repositories.id, repo.id))
  ));
  console.log(`[Admin] Deleted ${repos.length} repositories`);

  // Delete the installation
  await db.delete(installations).where(eq(installations.id, installationId));
  console.log(`[Admin] Deleted installation ${installation.accountName}`);
  
  revalidatePath('/admin');
  return { success: true, deletedRepos: repos.length };
}

export async function reindexRepository(repositoryId: string) {
  await requireAdmin();
  console.log(`[Admin] Reindex requested for repository: ${repositoryId}`);
  
  // Get the repository with installation
  const [repo] = await db.select().from(repositories).where(eq(repositories.id, repositoryId));
  if (!repo) {
    return { success: false, error: 'Repository not found' };
  }

  const [installation] = await db.select().from(installations).where(eq(installations.id, repo.installationId));
  if (!installation) {
    return { success: false, error: 'Installation not found' };
  }

  // Reset indexedAt
  await db.update(repositories).set({
    indexedAt: null,
  }).where(eq(repositories.id, repositoryId));
  
  // Enqueue indexing job
  const queue = getIndexingQueue();
  await queue.add(`index-${repo.fullName}`, {
    installationId: installation.githubInstallationId,
    repositoryId: repo.githubRepoId,
    repositoryFullName: repo.fullName,
  });
  console.log(`[Admin] Enqueued indexing job for ${repo.fullName}`);
  
  revalidatePath('/admin');
  return { success: true };
}

export async function clearRepositoryVectors(repositoryId: string) {
  await requireAdmin();
  console.log(`[Admin] Clear vectors requested for repository: ${repositoryId}`);
  
  // Get the repository
  const [repo] = await db.select().from(repositories).where(eq(repositories.id, repositoryId));
  if (!repo) {
    return { success: false, error: 'Repository not found' };
  }

  try {
    // Delete vectors from Qdrant for this repo
    const qdrant = getQdrantClient();
    await qdrant.delete(COLLECTION_NAME, {
      filter: {
        must: [
          { key: 'repoId', match: { value: repo.githubRepoId } }
        ]
      }
    });
    console.log(`[Admin] Deleted vectors for repo ${repo.fullName}`);
  } catch (error) {
    console.error(`[Admin] Failed to delete vectors:`, error);
    // Continue even if Qdrant fails - might not have vectors yet
  }

  // Reset indexedAt
  await db.update(repositories).set({
    indexedAt: null,
  }).where(eq(repositories.id, repositoryId));
  
  revalidatePath('/admin');
  return { success: true };
}

export async function toggleGlobalReviews(enabled: boolean) {
  await requireAdmin();
  console.log(`[Admin] Global reviews ${enabled ? 'enabled' : 'disabled'}`);
  
  try {
    const redis = getRedisClient();
    await redis.set('reviewscope:global:reviews_enabled', enabled ? '1' : '0');
    await redis.quit();
    console.log(`[Admin] Stored reviews_enabled = ${enabled} in Redis`);
  } catch (error) {
    console.error(`[Admin] Failed to store setting in Redis:`, error);
    return { success: false, error: 'Failed to update setting' };
  }
  
  revalidatePath('/admin');
  return { success: true, enabled };
}

export async function toggleGlobalIndexing(enabled: boolean) {
  await requireAdmin();
  console.log(`[Admin] Global indexing ${enabled ? 'enabled' : 'disabled'}`);
  
  try {
    const redis = getRedisClient();
    await redis.set('reviewscope:global:indexing_enabled', enabled ? '1' : '0');
    await redis.quit();
    console.log(`[Admin] Stored indexing_enabled = ${enabled} in Redis`);
  } catch (error) {
    console.error(`[Admin] Failed to store setting in Redis:`, error);
    return { success: false, error: 'Failed to update setting' };
  }
  
  revalidatePath('/admin');
  return { success: true, enabled };
}

export async function updateInstallationPlan(installationId: string, planName: string) {
  await requireAdmin();
  console.log(`[Admin] Plan update requested for installation: ${installationId} to ${planName}`);

  // Map plan names to GitHub Marketplace IDs
  const PLAN_MAP: Record<string, number> = {
    'Free': 3,
    'Pro': 7,
    'Team': 8
  };

  const planId = PLAN_MAP[planName] || 3;

  await db.update(installations).set({
    planName,
    planId,
    status: 'active',
    swapCount: 0,
    lastSwapReset: new Date(),
    expiresAt: null, // Clear expiration for manual admin updates
    updatedAt: new Date(),
  }).where(eq(installations.id, installationId));

  revalidatePath('/admin');
  return { success: true };
}

// Helper to check global settings (for use in worker)
export async function getGlobalSettings() {
  // No admin check needed here as this is a read-only helper for workers/internals
  try {
    const redis = getRedisClient();
    const reviewsEnabled = await redis.get('reviewscope:global:reviews_enabled');
    const indexingEnabled = await redis.get('reviewscope:global:indexing_enabled');
    await redis.quit();
    
    return {
      reviewsEnabled: reviewsEnabled !== '0', // Default to true if not set
      indexingEnabled: indexingEnabled !== '0', // Default to true if not set
    };
  } catch (error) {
    console.error(`[Admin] Failed to get settings from Redis:`, error);
    return { reviewsEnabled: true, indexingEnabled: true };
  }
}

export async function getSystemConfigStatus() {
  await requireAdmin();
  
  return {
    DATABASE_URL: !!process.env.DATABASE_URL,
    REDIS_URL: !!process.env.REDIS_URL,
    QDRANT_URL: !!process.env.QDRANT_URL,
    GITHUB_APP_ID: !!process.env.GITHUB_APP_ID,
    GITHUB_PRIVATE_KEY: !!process.env.GITHUB_PRIVATE_KEY,
    ENCRYPTION_KEY: !!process.env.ENCRYPTION_KEY,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
  };
}
