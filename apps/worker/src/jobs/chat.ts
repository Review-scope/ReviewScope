import { GitHubClient } from '../lib/github.js';
import { RAGRetriever, RAGIndexer } from '@reviewscope/context-engine';
import { createConfiguredProvider } from '../lib/ai-review.js';
import { CHAT_SYSTEM_PROMPT } from '@reviewscope/llm-core';
import { db, repositories, installations } from '../../../api/src/db/index.js';
import { eq, and } from 'drizzle-orm';

export interface ChatJobData {
  installationId: number;
  repositoryId: number;
  repositoryFullName: string;
  prNumber: number;
  userQuestion: string;
  commentId: number;
  commentType: 'issue' | 'review';
}

const gh = new GitHubClient();

export async function processChatJob(data: ChatJobData): Promise<void> {
  console.warn(`[Chat] Processing question in PR #${data.prNumber}`);

  const [owner, repo] = data.repositoryFullName.split('/');

  try {
    // 1. Get Context
    const [dbInst] = await db.select().from(installations).where(eq(installations.githubInstallationId, data.installationId));
    const [dbRepo] = await db.select().from(repositories).where(and(eq(repositories.githubRepoId, data.repositoryId), eq(repositories.installationId, dbInst.id)));

    // Enforce Chat limits for Free plan: REMOVED

    const diff = await gh.getPullRequestDiff(data.installationId, owner, repo, data.prNumber);

    
    let ragContext = '';
    if (dbRepo?.indexedAt) {
      const { provider } = await createConfiguredProvider(dbInst.id);
      
      // Ensure index exists (fixes the 400 error)
      const indexer = new RAGIndexer(provider);
      await indexer.ensureCollection();

      const retriever = new RAGRetriever(provider);
      const results = await retriever.retrieve(data.repositoryId.toString(), data.userQuestion, 3);
      ragContext = results.map(r => `File: ${r.file}\nSnippet: ${r.content}`).join('\n\n');
    }

    // 2. Call LLM
    const { provider: llmProvider } = await createConfiguredProvider(dbInst.id);
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
    
    if (data.commentType === 'review') {
      await octokit.rest.pulls.createReplyForReviewComment({
        owner,
        repo,
        pull_number: data.prNumber,
        comment_id: data.commentId,
        body: `> ${data.userQuestion.split('\n')[0]}...\n\n${response.content}`,
      });
    } else {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: data.prNumber,
        body: `> ${data.userQuestion.split('\n')[0]}...\n\n${response.content}`,
      });
    }

    console.warn(`[Chat] Replied to PR #${data.prNumber} (Type: ${data.commentType || 'issue'})`);

  } catch (err) {
    console.error(`[Chat] Failed to reply:`, err);
    throw err;
  }
}
