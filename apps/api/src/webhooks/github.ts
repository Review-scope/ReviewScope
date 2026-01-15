import { Hono } from 'hono';
import { Webhooks } from '@octokit/webhooks';
import { 
  enqueueReviewJob, 
  enqueueChatJob, 
  enqueueIndexingJob,
  getReviewQueue,
  getIndexingQueue,
  getChatQueue 
} from '../lib/queue.js';
import { db, installations, repositories, marketplaceEvents, configs, reviews } from '../db/index.js';
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

let webhooksInstance: Webhooks | null = null;
function getWebhooks() {
  if (!webhooksInstance) {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error('GITHUB_WEBHOOK_SECRET is not defined');
    }
    webhooksInstance = new Webhooks({ secret });
  }
  return webhooksInstance;
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
  const webhooks = getWebhooks();
  const signature = c.req.header('x-hub-signature-256') || '';
  const eventName = c.req.header('x-github-event') || '';
  const deliveryId = c.req.header('x-github-delivery') || '';

  const body = await c.req.text();
  console.warn(`[Webhook] Incoming event: ${eventName} (Delivery: ${deliveryId})`);

  // Verify signature
  try {
    const isValid = await webhooks.verify(body, signature);
    if (!isValid) {
      return c.json({ error: 'Invalid signature' }, 401);
    }
  } catch (err) {
    console.error('Signature verification failed:', err);
    return c.json({ error: 'Signature verification failed' }, 401);
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
    const { action, marketplace_purchase: mp, sender } = payload;
    const account = mp.account;

    console.warn(`Marketplace event: ${action} for ${account.login} (Plan: ${mp.plan.name})`);

    // Log event
    await db.insert(marketplaceEvents).values({
      githubAccountId: account.id,
      action: action,
      planId: mp.plan.id,
      sender: sender.login,
      payload: payload,
    });

    // Update installation if it exists
    if (action === 'purchased' || action === 'changed') {
      await db.update(installations).set({
        planId: mp.plan.id,
        planName: mp.plan.name,
        expiresAt: mp.ends_at ? new Date(mp.ends_at) : null,
        updatedAt: new Date(),
      }).where(eq(installations.accountName, account.login));
    } else if (action === 'cancelled') {
      await db.update(installations).set({
        planId: null,
        planName: 'Free',
        expiresAt: null,
        updatedAt: new Date(),
      }).where(eq(installations.accountName, account.login));
    }

    return c.json({ status: 'marketplace_synced' });
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
    const [existingRepo] = await db.select().from(repositories).where(
      and(
        eq(repositories.githubRepoId, repo.id),
        eq(repositories.installationId, dbInst.id)
      )
    );

    if (!existingRepo) {
      // New repo being added - check limit
      const activeRepos = await db.select().from(repositories).where(
        and(
          eq(repositories.installationId, dbInst.id),
          eq(repositories.status, 'active')
        )
      );

      if (activeRepos.length >= limits.maxRepos) {
        console.warn(`[Webhook] Aborting: installation ${dbInst.id} (${dbInst.accountName}) reached repo limit (${limits.maxRepos})`);
        
        // Notify user via GitHub Comment (only once per PR)
        const octokit = await gh.getInstallationClient(installation.id);
        await octokit.rest.issues.createComment({
          owner: repo.owner.login,
          repo: repo.name,
          issue_number: pr.number,
          body: `### 🛑 ReviewScope Limit Reached
Your current **${limits.tier}** plan supports up to **${limits.maxRepos}** repositories. 

This repository could not be connected because you have reached your plan's limit. 

To enable reviews for this repository, please:
1. [Upgrade your plan](${process.env.DASHBOARD_URL || '#'}/pricing)
2. Disable an existing repository in the [Dashboard](${process.env.DASHBOARD_URL || '#'}/dashboard)`,
        });
        
        return c.json({ status: 'limit_reached', type: 'max_repos' });
      }
    }

    const [dbRepo] = await db.insert(repositories).values({
      installationId: dbInst.id,
      githubRepoId: repo.id,
      fullName: repo.full_name,
    }).onConflictDoUpdate({
      target: repositories.githubRepoId,
      set: { fullName: repo.full_name, status: 'active' }, // Ensure it's marked active if re-added
    }).returning();


    if (dbRepo.status !== 'active') {
      console.warn(`[Webhook] Skipping PR #${pr.number}: Repository ${repo.full_name} is ${dbRepo.status}`);
      return c.json({ status: 'ignored_inactive_repo' });
    }

    const [config] = await db.select().from(configs).where(eq(configs.installationId, dbInst.id)).limit(1);

    if (!config?.apiKeyEncrypted) {
      console.warn(`[Webhook] Skipping review for ${repo.full_name} - No API key configured`);
      const octokit = await gh.getInstallationClient(installation.id);
      await octokit.rest.issues.createComment({
        owner: repo.owner.login,
        repo: repo.name,
        issue_number: pr.number,
        body: `### ⚠️ ReviewScope: API Key Missing
AI-powered review was skipped because no API key has been configured for this installation.

Please [setup your API key in the dashboard](http://localhost:3000/users/${dbInst.id}/config) to enable automated reviews.`,
      });
      return c.json({ status: 'skipped_no_config' });
    }

    // Check daily limit
    const limitExceeded = await checkDailyLimit(dbInst.id, limits);
    if (limitExceeded) {
      console.warn(`[Webhook] Daily limit exceeded for installation ${dbInst.id} (${limits.tier} tier)`);
      const octokit = await gh.getInstallationClient(installation.id);
      await octokit.rest.issues.createComment({
        owner: repo.owner.login,
        repo: repo.name,
        issue_number: pr.number,
        body: `### 📊 ReviewScope Daily Limit Reached
Your **${limits.tier}** plan allows **${limits.chatPerPRLimit}** reviews per day. You've reached today's limit.

Reviews will resume tomorrow at 00:00 UTC, or you can [upgrade your plan](${process.env.DASHBOARD_URL || '#'}/pricing) for higher limits.`,
      });
      return c.json({ status: 'daily_limit_exceeded' });
    }

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

    return c.json({ status: 'queued', prNumber: pr.number });
  }

  // Handle Comment Commands
  if (eventName === 'issue_comment' && payload.action === 'created') {
    const { comment, issue, repository: repo, installation } = payload;
    
    if (!issue.pull_request || comment.user.type === 'Bot') {
      return c.json({ status: 'ignored' });
    }

    const body = comment.body.toLowerCase();
    if (!body.includes('@reviewscope')) {
      return c.json({ status: 'ignored', reason: 'no_mention' });
    }

    console.warn(`Command received in PR #${issue.number}: ${body}`);

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
    
    if (!dbRepo || dbRepo.status !== 'active') {
      console.warn(`[Webhook] Skipping command in PR #${issue.number}: Repository ${repo.full_name} is ${dbRepo?.status || 'not found'}`);
      return c.json({ status: 'ignored_inactive_repo' });
    }

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
      console.warn(`[Queue] Re-review enqueued for PR #${issue.number}`);
    } else {
      // 💬 CHAT MODE: Treat as a question
      await enqueueChatJob({
        installationId: installation.id,
        repositoryId: repo.id,
        repositoryFullName: repo.full_name,
        prNumber: issue.number,
        userQuestion: comment.body,
        commentId: comment.id,
      });
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
            set: { fullName: repo.full_name },
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
      
      // Check if installation has an API key configured OR server has fallback keys
      const [config] = await db.select().from(configs).where(eq(configs.installationId, dbInst.id)).limit(1);
      const hasUserKey = !!config?.apiKeyEncrypted;
      const hasServerKey = !!(process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY);
      const canIndex = hasUserKey || hasServerKey;
      
      for (const repo of repositories_added) {
        await db.insert(repositories).values({
          installationId: dbInst.id,
          githubRepoId: repo.id,
          fullName: repo.full_name,
        }).onConflictDoUpdate({
          target: repositories.githubRepoId,
          set: { fullName: repo.full_name, installationId: dbInst.id },
        });

        // If any API key exists (user or server), trigger indexing
        if (canIndex) {
          console.warn(`[Webhook] Enqueueing indexing for newly added repo: ${repo.full_name} (using ${hasUserKey ? 'user' : 'server'} key)`);
          await enqueueIndexingJob({
            installationId: installation.id,
            repositoryId: repo.id,
            repositoryFullName: repo.full_name,
          });
        }
      }

      if (!canIndex) {
        console.warn(`[Webhook] Skipping indexing - no API key configured (user or server)`);
      }

      return c.json({ status: 'repositories_added', count: repositories_added.length, indexed: canIndex });
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

  return c.json({ status: 'ignored', event: eventName });
});
