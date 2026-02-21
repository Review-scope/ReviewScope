import { GitHubClient } from '../lib/github.js';
import { RAGRetriever, RAGIndexer, ContextAssembler, systemGuardrailsLayer, repoMetadataLayer, complexityAssessmentLayer, issueIntentLayer, ruleViolationsLayer, relatedFilesLayer, ragContextLayer, webContextLayer, focusedContextLayer, prDiffLayer, userPromptLayer, userQuestionLayer } from '@reviewscope/context-engine';
import { createConfiguredProvider } from '../lib/ai-review.js';
import { resolveEmbeddingModel, shouldSkipEmbeddings } from '../lib/embedding-model.js';
import { CHAT_SYSTEM_PROMPT } from '@reviewscope/llm-core';
import { db, repositories, installations, configs } from '../../../api/src/db/index.js';
import { eq, and } from 'drizzle-orm';
import { getTier, PlanTier } from '../lib/plans.js';

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
    const [config] = await db.select().from(configs).where(eq(configs.installationId, dbInst.id));

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
      if (!shouldSkipEmbeddings(provider.name, config?.model)) {
        const embeddingModel = resolveEmbeddingModel(provider);
        console.warn(`[Chat] RAG embedding model: ${provider.name}/${embeddingModel}`);

        // Ensure index exists (fixes the 400 error)
        const indexer = new RAGIndexer(provider, { embeddingModel });
        await indexer.ensureCollection();

        const retriever = new RAGRetriever(provider, { embeddingModel });
        const results = await retriever.retrieve(data.repositoryId.toString(), data.userQuestion, 3);
        ragContext = results.map(r => `File: ${r.file}\nSnippet: ${r.content}`).join('\n\n');
      }
    }

    // 4. Assemble Context using Context Engineering layers (Unified)
    const assembler = new ContextAssembler();
    assembler.addLayer(systemGuardrailsLayer);
    assembler.addLayer(repoMetadataLayer);
    assembler.addLayer(complexityAssessmentLayer);
    assembler.addLayer(issueIntentLayer);
    assembler.addLayer(ruleViolationsLayer);
    assembler.addLayer(relatedFilesLayer);
    assembler.addLayer(ragContextLayer);
    assembler.addLayer(webContextLayer);
    assembler.addLayer(focusedContextLayer);
    assembler.addLayer(prDiffLayer);
    assembler.addLayer(userPromptLayer);
    assembler.addLayer(userQuestionLayer);

    const { provider: llmProvider } = await createConfiguredProvider(dbInst.id);
    const defaultModel = getTier(dbInst.planId) === PlanTier.FREE
      ? 'sarvam-m'
      : llmProvider.name === 'openai'
        ? 'gpt-4o'
        : 'gemini-2.5-flash';
    const modelName = config?.model || defaultModel;

    const assembled = await assembler.assemble({
        repositoryFullName: data.repositoryFullName,
        prNumber: data.prNumber,
        prTitle: '', // Optional for chat
        prBody: '', // Optional for chat
        diff: fullDiff,
        ragContext: ragContext,
        focusedContext: specificContext,
        userQuestion: data.userQuestion,
    }, modelName);

    console.warn(`[Chat] Context assembled: ${assembled.usedTokens} tokens (Budget: ${assembled.budgetTokens})`);

    // 5. Call LLM
    const messages = [
      { role: 'system' as const, content: CHAT_SYSTEM_PROMPT },
      { role: 'user' as const, content: assembled.content } 
    ];



    const response = await llmProvider.chat(messages, {
      model: modelName,
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
