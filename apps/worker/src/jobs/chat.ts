import { GitHubClient } from '../lib/github.js';
import { RAGRetriever, RAGIndexer } from '@reviewscope/context-engine';
import { createConfiguredProvider } from '../lib/ai-review.js';
import { CHAT_SYSTEM_PROMPT } from '@reviewscope/llm-core';
import { db, repositories, installations } from '../../../api/src/db/index.js';
import { eq, and } from 'drizzle-orm';
import { getPlanLimits } from '../lib/plans.js';

export interface ChatJobData {
  installationId: number;
  repositoryId: number;
  repositoryFullName: string;
  prNumber: number;
  userQuestion: string;
  commentId: number;
}

const gh = new GitHubClient();

export async function processChatJob(data: ChatJobData): Promise<void> {
  console.warn(`[Chat] Processing question in PR #${data.prNumber}`);

  const [owner, repo] = data.repositoryFullName.split('/');

  try {
    // 1. Get Context
    const [dbInst] = await db.select().from(installations).where(eq(installations.githubInstallationId, data.installationId));
    const [dbRepo] = await db.select().from(repositories).where(and(eq(repositories.githubRepoId, data.repositoryId), eq(repositories.installationId, dbInst.id)));

    const limits = getPlanLimits(dbInst.planId);

    // Enforce Chat limits for Free plan
    if (limits.chatPerPRLimit !== 'unlimited') {
      const octokit = await gh.getInstallationClient(data.installationId);
      
      // List all issue comments for this PR
      const comments = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: data.prNumber,
      });

      // Count how many times ReviewScope has replied to a @mention in this PR
      // This is a simple heuristic: count comments by the bot that look like replies
      const botLogin = 'review-scope[bot]'; // Use your app's actual bot name
      const reviewScopeReplies = comments.data.filter(c => 
        c.user?.login === botLogin && 
        c.body?.startsWith('> ') // Replies in processChatJob start with quote
      ).length;

      if (reviewScopeReplies >= limits.chatPerPRLimit) {
        console.warn(`[Chat] Limit exceeded for PR #${data.prNumber}: ${reviewScopeReplies}/${limits.chatPerPRLimit}`);
        await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: data.prNumber,
          body: `> ${data.userQuestion.split('\n')[0]}...\n\n### 🛑 Chat Limit Reached
You have reached the limit of **${limits.chatPerPRLimit} follow-up questions** per PR for the **${limits.tier}** plan.

To continue the discussion or ask more questions, please [upgrade to the Pro or Team plan](${process.env.DASHBOARD_URL || '#'}/pricing).`,
        });
        return;
      }
    }

    const diff = await gh.getPullRequestDiff(data.installationId, owner, repo, data.prNumber);

    
    let ragContext = '';
    if (dbRepo?.indexedAt) {
      const provider = await createConfiguredProvider(dbInst.id);
      
      // Ensure index exists (fixes the 400 error)
      const indexer = new RAGIndexer(provider);
      await indexer.ensureCollection();

      const retriever = new RAGRetriever(provider);
      const results = await retriever.retrieve(data.repositoryId.toString(), data.userQuestion, 3);
      ragContext = results.map(r => `File: ${r.file}\nSnippet: ${r.content}`).join('\n\n');
    }

    // 2. Call LLM
    const llmProvider = await createConfiguredProvider(dbInst.id);
    const messages = [
      { role: 'system' as const, content: CHAT_SYSTEM_PROMPT },
      { role: 'user' as const, content: `
## PR Diff
${diff}

## RAG Context
${ragContext}

## User Question
${data.userQuestion}
` } 
    ];

    const response = await llmProvider.chat(messages, {
      model: 'gemini-2.5-flash',
      temperature: 0.1,
    });

    // 3. Post Reply to GitHub
    const octokit = await gh.getInstallationClient(data.installationId);
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: data.prNumber,
      body: `> ${data.userQuestion.split('\n')[0]}...\n\n${response.content}`,
    });

    console.warn(`[Chat] Replied to PR #${data.prNumber}`);

  } catch (err) {
    console.error(`[Chat] Failed to reply:`, err);
    throw err;
  }
}
