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

    // 2. Fetch specific context if it's a review comment (Focused Reply)
    let specificContext = '';
    let fullDiff = ''; // Only fetch if needed

    if (data.commentType === 'review') {
        try {
            // We assume data.commentId is the USER's comment ID (the reply)
            const userComment = await gh.getReviewComment(data.installationId, owner, repo, data.commentId);
            
            if (userComment.in_reply_to_id) {
                const parentComment = await gh.getReviewComment(data.installationId, owner, repo, userComment.in_reply_to_id);
                
                specificContext = `
## Focused File Context
File: ${parentComment.path}
Line: ${parentComment.line || parentComment.original_line}

\`\`\`diff
${parentComment.diff_hunk}
\`\`\`

## Previous Comment (Context)
${parentComment.body}
`;
            }
        } catch (e) {
            console.warn('[Chat] Failed to fetch specific review comment context, falling back to full diff', e);
        }
    }

    // Only fetch full diff if we don't have specific context
    if (!specificContext) {
        fullDiff = await gh.getPullRequestDiff(data.installationId, owner, repo, data.prNumber);
    }

    // 3. RAG Retrieval
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

    // 4. Construct Prompt
    let promptContent = '';
    
    if (specificContext) {
        // Focused Prompt
        promptContent = `
${specificContext}

## RAG Context (Reference)
${ragContext}

## User Question
${data.userQuestion}
`;
    } else {
        // General Prompt (Full PR Context)
        promptContent = `
## PR Diff
${fullDiff}

## RAG Context
${ragContext}

## User Question
${data.userQuestion}
`;
    }

    // 5. Call LLM
    const { provider: llmProvider } = await createConfiguredProvider(dbInst.id);
    const messages = [
      { role: 'system' as const, content: CHAT_SYSTEM_PROMPT },
      { role: 'user' as const, content: promptContent } 
    ];

    const response = await llmProvider.chat(messages, {
      model: 'gemini-2.5-flash',
      temperature: 0.1,
    });

    // 6. Post Reply to GitHub
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
