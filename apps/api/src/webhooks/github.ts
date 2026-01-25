import { Hono } from 'hono';
import crypto from 'crypto';
import { 
  enqueueReviewJob, 
  enqueueChatJob, 
  enqueueIndexingJob,
  getReviewQueue,
  getIndexingQueue,
  getChatQueue 
} from '../lib/queue.js';
import { db, installations, repositories, configs, reviews } from '../db/index.js';
import { eq, and, gte } from 'drizzle-orm';
import { GitHubClient } from '../../../worker/src/lib/github.js';
import { getPlanLimits } from '../../../worker/src/lib/plans.js';
import { QdrantClient } from '@qdrant/js-client-rest';


const gh = new GitHubClient();

const COLLECTION_NAME = 'reviewscope_repos';

// Qdrant client for vector cleanup
function getQdrantClient() {
  const url = process.env.QDRANT_URL;
  const apiKey = process.env.QDRANT_API_KEY;
  if (!url) return null; // Optional - don't fail if not configured
  return new QdrantClient({ url, apiKey });
}

/**
 * Check if installation has exceeded daily review limit for their plan tier
 */
async function checkDailyLimit(installationId: string, planLimits: ReturnType<typeof getPlanLimits>): Promise<boolean> {
  // Unlimited tier doesn't need limit checks
  if (planLimits.chatPerPRLimit === 'unlimited') {
    return false; // No limit exceeded
  }

  // Get today's date at 00:00 UTC
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Count reviews created today
  const todayReviews = await db.select().from(reviews)
    .innerJoin(repositories, eq(reviews.repositoryId, repositories.id))
    .where(
      and(
        eq(repositories.installationId, installationId),
        gte(reviews.createdAt, today)
      )
    );

  return todayReviews.length >= (planLimits.chatPerPRLimit as number);
}

export const githubWebhook = new Hono();

githubWebhook.post('/', async (c) => {
  console.warn(`[Webhook] Request received: ${c.req.method} ${c.req.url}`);
  const signature = c.req.header('x-hub-signature-256') || '';
  const eventName = c.req.header('x-github-event') || '';
  const deliveryId = c.req.header('x-github-delivery') || '';

  const bodyBuffer = await c.req.arrayBuffer();
  const rawBody = Buffer.from(bodyBuffer);
  const body = rawBody.toString('utf-8');
  
  console.warn(`[Webhook] Incoming event: ${eventName} (Delivery: ${deliveryId})`);

  // Verify signature
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[Webhook] GITHUB_WEBHOOK_SECRET is not defined');
    return c.json({ error: 'Configuration error' }, 500);
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const calculatedSignature = `sha256=${hmac.digest('hex')}`;

  // console.log(`[Webhook Debug] Secret Length: ${secret.length}`);
  // console.log(`[Webhook Debug] Received Signature: ${signature}`);
  // console.log(`[Webhook Debug] Calculated Signature: ${calculatedSignature}`);
  // console.log(`[Webhook Debug] Body Length: ${rawBody.length}`);

  if (signature !== calculatedSignature) {
    try {
      const trusted = Buffer.from(calculatedSignature);
      const untrusted = Buffer.from(signature);
      
      if (trusted.length !== untrusted.length || !crypto.timingSafeEqual(trusted, untrusted)) {
         console.error('[Webhook] Invalid signature');
         return c.json({ error: 'Invalid signature' }, 401);
      }
    } catch (err) {
       console.error('[Webhook] Signature verification error:', err);
       return c.json({ error: 'Invalid signature' }, 401);
    }
  }

  const payload = JSON.parse(body);

  // Sync Installation & Repository Data
  if (payload.installation && payload.installation.account && eventName !== 'marketplace_purchase') {
    const instId = payload.installation.id;
    const account = payload.installation.account;

    // UPSERT Installation
    await db.insert(installations).values({
      githubInstallationId: instId,
      githubAccountId: account.id,
      accountType: account.type,
      accountName: account.login,
    }).onConflictDoUpdate({
      target: installations.githubInstallationId,
      set: { 
        githubAccountId: account.id,
        accountName: account.login, 
        updatedAt: new Date() 
      },
    });
  }

  // Handle Marketplace Events
  if (eventName === 'marketplace_purchase') {
    // GitHub Marketplace logic removed in favor of Dodo Payments
    console.warn(`[Webhook] Ignoring GitHub Marketplace event: ${payload.action}`);
    return c.json({ status: 'ignored_dodo_payments_active' });
  }

  // Handle Event Types
  if (eventName === 'pull_request') {
    const { action, pull_request: pr, repository: repo, installation } = payload;

    if (action === 'closed') return c.json({ status: 'ignored', reason: 'closed_pr' });
    if (pr.draft) return c.json({ status: 'ignored', reason: 'draft_pr' });
    if (pr.user?.type === 'Bot') return c.json({ status: 'ignored', reason: 'bot_pr' });

    const allowedActions = ['opened', 'reopened', 'synchronize'];
    if (!allowedActions.includes(action)) {
      return c.json({ status: 'ignored', reason: `action_${action}_not_relevant` });
    }

    console.warn(`Processing PR #${pr.number} in ${repo.full_name} (Action: ${action})`);

    const [dbInst] = await db.select().from(installations).where(eq(installations.githubInstallationId, installation.id));
    if (!dbInst || dbInst.status !== 'active') {
      console.warn(`[Webhook] Skipping PR #${pr.number}: Installation ${installation.id} is ${dbInst?.status || 'not found'}`);
      return c.json({ status: 'ignored_inactive_installation' });
    }

    // COMPLIANCE: Enforce maxRepos limit based on plan
    const limits = getPlanLimits(dbInst.planId);
    
    // Check if this repository is already registered
    await db.select().from(repositories).where(
      and(
        eq(repositories.githubRepoId, repo.id),
        eq(repositories.installationId, dbInst.id)
      )
    );

    // [MODIFIED] No auto-quota check here. New repos are inserted as isActive: false.
    // Quota is enforced at Activation time in Dashboard.

    const [dbRepo] = await db.insert(repositories).values({
      installationId: dbInst.id,
      githubRepoId: repo.id,
      fullName: repo.full_name,
      // isActive defaults to false
    }).onConflictDoUpdate({
      target: repositories.githubRepoId,
      set: { 
        fullName: repo.full_name, 
        installationId: dbInst.id,
        status: 'active' 
      }, 
    }).returning();


    if (dbRepo.status !== 'active' || !dbRepo.isActive) {
      console.warn(`[Webhook] Skipping PR #${pr.number}: Repository ${repo.full_name} is ${dbRepo.status} (Active: ${dbRepo.isActive})`);
      return c.json({ status: 'ignored_inactive_repo' });
    }

    const [config] = await db.select().from(configs).where(eq(configs.installationId, dbInst.id)).limit(1);

    if (!config?.apiKeyEncrypted) {
      console.warn(`[Webhook] No user API key configured for ${repo.full_name}. Proceeding with system fallback if available.`);
    }

    // Check daily limit
    const limitExceeded = await checkDailyLimit(dbInst.id, limits);
    if (limitExceeded) {
      console.warn(`[Webhook] Daily limit exceeded for installation ${dbInst.id} (${limits.tier} tier)`);
      try {
        const octokit = await gh.getInstallationClient(installation.id);
        await octokit.rest.issues.createComment({
          owner: repo.owner.login,
          repo: repo.name,
          issue_number: pr.number,
          body: `### 📊 ReviewScope Daily Limit Reached
Your **${limits.tier}** plan allows **${limits.chatPerPRLimit}** reviews per day. You've reached today's limit.

Reviews will resume tomorrow at 00:00 UTC, or you can [upgrade your plan](${process.env.DASHBOARD_URL || '#'}/pricing) for higher limits.`,
        });
      } catch (err: unknown) {
        console.error(`[Webhook] Failed to post limit-exceeded comment: ${(err as Error).message}`);
      }
      return c.json({ status: 'daily_limit_exceeded' });
    }

    try {
      await enqueueReviewJob({
        jobVersion: 1,
        installationId: installation.id,
        repositoryId: repo.id,
        repositoryFullName: repo.full_name,
        prNumber: pr.number,
        prTitle: pr.title,
        prBody: pr.body || '',
        headSha: pr.head.sha,
        baseSha: pr.base.sha,
        deliveryId,
      });
      console.warn(`[Webhook] Successfully enqueued review job for PR #${pr.number}`);
    } catch (err: unknown) {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      console.error(`[Webhook] Failed to enqueue review job: ${(err as any).message}`);
      return c.json({ error: 'Failed to enqueue review job' }, 500);
    }

    return c.json({ status: 'queued', prNumber: pr.number });
  }

  // Handle Comment Commands
  if (eventName === 'issue_comment' && payload.action === 'created') {
    const { comment, issue, repository: repo, installation } = payload;
    
    if (!issue.pull_request || comment.user.type === 'Bot') {
      return c.json({ status: 'ignored' });
    }

    const body = comment.body.toLowerCase();
    if (!body.includes('@review-scope')) {
      return c.json({ status: 'ignored', reason: 'no_mention' });
    }

    console.warn(`[Webhook] Command received in PR #${issue.number}: ${body}`);

    // Check DB status before enqueuing
    const [dbInst] = await db.select().from(installations).where(eq(installations.githubInstallationId, installation.id));
    const [dbRepo] = await db.select().from(repositories).where(
      and(
        eq(repositories.githubRepoId, repo.id),
        eq(repositories.installationId, dbInst?.id || '')
      )
    );

    if (!dbInst || dbInst.status !== 'active') {
      console.warn(`[Webhook] Skipping command in PR #${issue.number}: Installation ${installation.id} is ${dbInst?.status || 'not found'}`);
      return c.json({ status: 'ignored_inactive_installation' });
    }
    
    if (!dbRepo || dbRepo.status !== 'active' || !dbRepo.isActive) {
      console.warn(`[Webhook] Skipping command in PR #${issue.number}: Repository ${repo.full_name} is ${dbRepo?.status || 'not found'} (Active: ${dbRepo?.isActive})`);
      return c.json({ status: 'ignored_inactive_repo' });
    }

    try {
      if (body.includes('re-review')) {
        const [owner, name] = repo.full_name.split('/');
        const pr = await gh.getPullRequest(installation.id, owner, name, issue.number);
        
        await enqueueReviewJob({
          jobVersion: 1,
          installationId: installation.id,
          repositoryId: repo.id,
          repositoryFullName: repo.full_name,
          prNumber: issue.number,
          prTitle: pr.title,
          prBody: pr.body || '',
          headSha: pr.head.sha,
          baseSha: pr.base.sha,
          deliveryId: `re-review-${Date.now()}`,
        });
        console.warn(`[Webhook] Re-review enqueued for PR #${issue.number}`);
      } else {
        // 💬 CHAT MODE: Treat as a question
        await enqueueChatJob({
          installationId: installation.id,
          repositoryId: repo.id,
          repositoryFullName: repo.full_name,
          prNumber: issue.number,
          userQuestion: comment.body,
          commentId: comment.id,
          commentType: 'issue',
        });
        console.warn(`[Webhook] Chat job enqueued for PR #${issue.number}`);
      }
    } catch (err: unknown) {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      console.error(`[Webhook] Failed to enqueue command job: ${(err as any).message}`);
      return c.json({ error: 'Failed to enqueue command job' }, 500);
    }

    return c.json({ status: 'command_received' });
  }

  // Handle Review Comments (Inline)
  if (eventName === 'pull_request_review_comment' && payload.action === 'created') {
    const { comment, pull_request: pr, repository: repo, installation } = payload;
    
    if (comment.user.type === 'Bot') {
      return c.json({ status: 'ignored' });
    }

    const body = comment.body.toLowerCase();
    if (!body.includes('@review-scope')) {
      return c.json({ status: 'ignored', reason: 'no_mention' });
    }

    console.warn(`[Webhook] Review comment command received in PR #${pr.number}: ${body}`);

    // Check DB status
    const [dbInst] = await db.select().from(installations).where(eq(installations.githubInstallationId, installation.id));
    if (!dbInst || dbInst.status !== 'active') {
        return c.json({ status: 'ignored_inactive_installation' });
    }
    
    // Check Repo
     const [dbRepo] = await db.select().from(repositories).where(
      and(
        eq(repositories.githubRepoId, repo.id),
        eq(repositories.installationId, dbInst?.id || '')
      )
    );
    
    if (!dbRepo || dbRepo.status !== 'active' || !dbRepo.isActive) {
      return c.json({ status: 'ignored_inactive_repo' });
    }

    try {
        await enqueueChatJob({
          installationId: installation.id,
          repositoryId: repo.id,
          repositoryFullName: repo.full_name,
          prNumber: pr.number,
          userQuestion: comment.body,
          commentId: comment.id,
          commentType: 'review',
        });
        console.warn(`[Webhook] Chat job enqueued for review comment in PR #${pr.number}`);
    } catch (err: unknown) {
       /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
       console.error(`[Webhook] Failed to enqueue chat job: ${(err as any).message}`);
       return c.json({ error: 'Failed to enqueue chat job' }, 500);
    }
    
    return c.json({ status: 'command_received' });
  }

  // Handle Installation Sync
  if (eventName === 'installation') {
    if (payload.action === 'deleted') {
      const [dbInst] = await db.select().from(installations).where(eq(installations.githubInstallationId, payload.installation.id));
      
      let reposMarkedCount = 0;
      
      if (dbInst) {
        // Mark installation as inactive (don't actually delete - keep history)
        await db.update(installations).set({
          status: 'inactive',
          updatedAt: new Date(),
        }).where(eq(installations.id, dbInst.id));

        // Mark all repos as removed
        const removedRepos = await db.update(repositories).set({
          status: 'removed',
          updatedAt: new Date(),
        }).where(eq(repositories.installationId, dbInst.id)).returning();
        
        reposMarkedCount = removedRepos.length;

        // Clean up vectors from Qdrant using internal installationId
        const qdrant = getQdrantClient();
        if (qdrant) {
          try {
            await qdrant.delete(COLLECTION_NAME, {
              filter: {
                must: [{ key: 'installationId', match: { value: dbInst.id } }]
              }
            });
            console.warn(`[Webhook] Hard cleanup: Deleted all vectors for installation ${dbInst.id}`);
          } catch (error) {
            console.error('[Webhook] Failed to clean up vectors:', error);
          }
        }

        // Clean up BullMQ Queues (Optional - Guards already make this safe)
        try {
          const queues = [getReviewQueue(), getIndexingQueue(), getChatQueue()];
          for (const queue of queues) {
            const jobs = await queue.getJobs(['waiting', 'delayed']);
            for (const job of jobs) {
              if (job.data.installationId === payload.installation.id) {
                await job.remove();
              }
            }
          }
          console.warn(`[Webhook] Cleaned up waiting jobs for installation ${payload.installation.id}`);
        } catch (error) {
          console.error('[Webhook] Failed to clean up queues:', error);
        }

        console.warn(`[Webhook] Installation ${payload.installation.id} marked as inactive, ${removedRepos.length} repos marked as removed`);
      }
      
      return c.json({ status: 'uninstalled', reposMarked: reposMarkedCount });
    }

    if (payload.action === 'created' || payload.action === 'new_permissions_accepted') {
      const instId = payload.installation.id;
      const account = payload.installation.account;

      // Ensure any previous installations for this account are marked as inactive
      // since GitHub only allows one active installation per account.
      await db.update(installations)
        .set({ status: 'inactive', updatedAt: new Date() })
        .where(and(
          eq(installations.githubAccountId, account.id),
          eq(installations.status, 'active')
        ));

      const [dbInst] = await db.insert(installations).values({
        githubInstallationId: instId,
        githubAccountId: account.id,
        accountType: account.type,
        accountName: account.login,
      }).onConflictDoUpdate({
        target: installations.githubInstallationId,
        set: { 
          githubAccountId: account.id,
          accountName: account.login, 
          status: 'active', // Ensure it is active if we're revisiting an old installation record
          updatedAt: new Date() 
        },
      }).returning();

      if (payload.repositories) {
        for (const repo of payload.repositories) {
          await db.insert(repositories).values({
            installationId: dbInst.id,
            githubRepoId: repo.id,
            fullName: repo.full_name,
          }).onConflictDoUpdate({
            target: repositories.githubRepoId,
            set: { 
              fullName: repo.full_name,
              installationId: dbInst.id,
              status: 'active'
            },
          });
        }
      }
      return c.json({ status: 'installed' });
    }
  }

  // Handle Installation Repositories (added/removed)
  if (eventName === 'installation_repositories') {
    const { action, installation, repositories_added, repositories_removed } = payload;
    
    const [dbInst] = await db.select().from(installations).where(eq(installations.githubInstallationId, installation.id));
    if (!dbInst) {
      console.warn(`[Webhook] installation_repositories.${action}: Installation ${installation.id} not found in DB`);
      return c.json({ error: 'Installation not found' }, 404);
    }

    if (action === 'added' && repositories_added) {
      console.warn(`[Webhook] installation_repositories.added: Adding ${repositories_added.length} repos to installation ${installation.id}`);
      
      // [MODIFIED] Removed auto-quota check and auto-indexing.
      // Repos are added as isActive: false. User must activate them in Dashboard.
      
      const limits = getPlanLimits(dbInst.planId);
      
      for (const repo of repositories_added) {
        await db
          .insert(repositories)
          .values({
            installationId: dbInst.id,
            githubRepoId: repo.id,
            fullName: repo.full_name,
            // isActive: false (default)
          })
          .onConflictDoUpdate({
            target: repositories.githubRepoId,
            set: { 
              fullName: repo.full_name, 
              installationId: dbInst.id,
              status: 'active'
            },
          });
      }

      // Provide feedback
      return c.json({ 
        status: 'repositories_added', 
        count: repositories_added.length, 
        indexed: false, // No longer auto-indexing
        maxRepos: limits.maxRepos,
      });
    }

    if (action === 'removed' && repositories_removed) {
      console.warn(`[Webhook] installation_repositories.removed: Marking ${repositories_removed.length} repos as removed from installation ${installation.id}`);
      
      for (const repo of repositories_removed) {
        await db.update(repositories).set({
          status: 'removed',
          updatedAt: new Date(),
        }).where(eq(repositories.githubRepoId, repo.id));
      }

      // SOFT CLEANUP: Vectors are kept to save re-indexing costs if re-added.
      // Access is blocked by worker guards.

      return c.json({ status: 'repositories_removed', count: repositories_removed.length });
    }
  }

  // Handle Repository Events (deleted, visibility changes)
  if (eventName === 'repository') {
    const { action, repository: repo } = payload;

    if (action === 'deleted') {
      console.warn(`[Webhook] repository.deleted: Marking repo ${repo.full_name} (ID: ${repo.id}) as deleted`);
      
      const [deleted] = await db.update(repositories).set({
        status: 'deleted',
        indexedAt: null,
        updatedAt: new Date(),
      }).where(eq(repositories.githubRepoId, repo.id)).returning();

      // Clean up vectors from Qdrant (Hard cleanup)
      if (deleted) {
        const qdrant = getQdrantClient();
        if (qdrant) {
          try {
            await qdrant.delete(COLLECTION_NAME, {
              filter: {
                must: [{ key: 'repoId', match: { value: repo.id.toString() } }]
              }
            });
            console.warn(`[Webhook] Cleaned up vectors for deleted repo ${repo.full_name}`);
          } catch (error) {
            console.error('[Webhook] Failed to clean up vectors:', error);
          }
        }
      }

      return c.json({ status: 'repository_deleted', repoId: repo.id });
    }

    if (action === 'privatized') {
      console.warn(`[Webhook] repository.privatized: Repo ${repo.full_name} is now private`);
      await db.update(repositories).set({
        isPrivate: 1,
        updatedAt: new Date(),
      }).where(eq(repositories.githubRepoId, repo.id));
      return c.json({ status: 'repository_privatized', repoId: repo.id });
    }

    if (action === 'publicized') {
      console.warn(`[Webhook] repository.publicized: Repo ${repo.full_name} is now public`);
      await db.update(repositories).set({
        isPrivate: 0,
        updatedAt: new Date(),
      }).where(eq(repositories.githubRepoId, repo.id));
      return c.json({ status: 'repository_publicized', repoId: repo.id });
    }

    if (action === 'renamed') {
      console.warn(`[Webhook] repository.renamed: Repo renamed to ${repo.full_name}`);
      await db.update(repositories).set({
        fullName: repo.full_name,
        updatedAt: new Date(),
      }).where(eq(repositories.githubRepoId, repo.id));
      return c.json({ status: 'repository_renamed', repoId: repo.id });
    }
  }

  // Handle Push Events (Re-index on merge/push to default branch)
  if (eventName === 'push') {
    const { ref, repository: repo, installation } = payload;
    const defaultBranchRef = `refs/heads/${repo.default_branch}`;

    if (ref === defaultBranchRef) {
      console.warn(`[Webhook] Push to default branch (${repo.default_branch}) detected for ${repo.full_name}`);

      // Check if repo is active in DB
      const [dbInst] = await db.select().from(installations).where(eq(installations.githubInstallationId, installation.id));
      if (!dbInst || dbInst.status !== 'active') {
         return c.json({ status: 'ignored_inactive_installation' });
      }

      const [dbRepo] = await db.select().from(repositories).where(
        and(
          eq(repositories.githubRepoId, repo.id),
          eq(repositories.installationId, dbInst.id)
        )
      );

      if (!dbRepo || dbRepo.status !== 'active' || !dbRepo.isActive) {
         return c.json({ status: 'ignored_inactive_repo' });
      }

      // Check plan limits (allowRAG)
      const limits = getPlanLimits(dbInst.planId);
      if (!limits.allowRAG) {
         return c.json({ status: 'ignored_plan_limit', reason: 'rag_not_allowed' });
      }

      try {
        await enqueueIndexingJob({
          installationId: installation.id,
          repositoryId: repo.id,
          repositoryFullName: repo.full_name,
        });
        console.warn(`[Webhook] Enqueued re-indexing job for ${repo.full_name}`);
        return c.json({ status: 'indexing_queued', repo: repo.full_name });
      } catch (err: unknown) {
        console.error(`[Webhook] Failed to enqueue indexing job: ${(err as Error).message}`);
        return c.json({ error: 'Failed to enqueue indexing job' }, 500);
      }
    }
    
    return c.json({ status: 'ignored', reason: 'not_default_branch' });
  }

  return c.json({ status: 'ignored', event: eventName });
});
