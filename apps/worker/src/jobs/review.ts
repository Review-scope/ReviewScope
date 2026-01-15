import { GitHubClient } from '../lib/github.js';
import { parseDiff, filterNoise } from '../lib/parser.js';
import { parseIssueReferences, fetchIssueContext } from '../lib/issue.js';
import { fetchConfig } from '../lib/config.js';
import { calculateComplexity } from '../lib/complexity.js';
import { runRules } from '@reviewscope/rules-engine';
import { RAGRetriever, RAGIndexer } from '@reviewscope/context-engine';
import { createConfiguredProvider, runAIReview } from '../lib/ai-review.js';
import { db, reviews, repositories, installations, commentThreads, configs } from '../../../api/src/db/index.js';
import { eq, and } from 'drizzle-orm';
import { generateIssueKey } from '../lib/hash.js';
import picomatch from 'picomatch';
import { getPlanLimits, PlanTier } from '../lib/plans.js';

export interface ReviewJobData {
  jobVersion: 1;
  installationId: number;
  repositoryId: number;
  repositoryFullName: string;
  prNumber: number;
  prTitle: string;
  prBody: string;
  headSha: string;
  baseSha: string;
  deliveryId: string;
}

export interface ReviewResult {
  success: boolean;
  reviewerVersion: string;
  contextHash: string;
  comments: ReviewComment[];
  summary: string;
}

export interface ReviewComment {
  file: string;
  line: number;
  body: string;
  severity: 'error' | 'warning' | 'suggestion';
}

const gh = new GitHubClient();

import { sortAndLimitFiles, scoreFile } from '../lib/scoring.js';

export async function processReviewJob(data: ReviewJobData): Promise<ReviewResult> {
  console.warn(`[Worker] Started processing review for PR #${data.prNumber} in ${data.repositoryFullName}`);
  
  let dbReviewId: string | null = null;

  try {
    const [owner, repo] = data.repositoryFullName.split('/');

    // 1. Get DB context (Installation & Repository)
    const [dbInst] = await db.select().from(installations).where(eq(installations.githubInstallationId, data.installationId));
    if (!dbInst) {
      console.info(`[Worker] Skipping job: installation ${data.installationId} not found in database`);
      return { success: false, reviewerVersion: '0.0.1', contextHash: '', comments: [], summary: 'Installation not found' };
    }
    
    // Check installation status
    if (dbInst.status !== 'active') {
      console.info(`[Worker] Skipping job: installation ${data.installationId} is ${dbInst.status}`);
      return { success: false, reviewerVersion: '0.0.1', contextHash: '', comments: [], summary: `Installation inactive (${dbInst.status})` };
    }

    const [dbRepo] = await db.select().from(repositories).where(
      and(
        eq(repositories.githubRepoId, data.repositoryId),
        eq(repositories.installationId, dbInst.id)
      )
    );
    if (!dbRepo) {
      console.info(`[Worker] Skipping job: repository ${data.repositoryId} not found in database`);
      return { success: false, reviewerVersion: '0.0.1', contextHash: '', comments: [], summary: 'Repository not found' };
    }
    
    // Check repository status - COMPLIANCE: Must not process removed/deleted repos
    if (dbRepo.status !== 'active') {
      console.info(`[Worker] Skipping job: repository ${data.repositoryFullName} is ${dbRepo.status}`);
      return { success: false, reviewerVersion: '0.0.1', contextHash: '', comments: [], summary: `Repository inactive (${dbRepo.status})` };
    }

    // 2. Create or Update Review Record
    const [insertedReview] = await db.insert(reviews).values({
      repositoryId: dbRepo.id,
      prNumber: data.prNumber,
      status: 'processing',
      reviewerVersion: '0.0.1',
      deliveryId: data.deliveryId,
    }).onConflictDoUpdate({
      target: [reviews.repositoryId, reviews.prNumber],
      set: { 
        status: 'processing', 
        deliveryId: data.deliveryId, 
        error: null,
        processedAt: null,
        updatedAt: new Date(), 
      },
    }).returning();
    
    dbReviewId = insertedReview.id;

    // Fetch Plan Limits
    const limits = getPlanLimits(dbInst.planId);
    console.warn(`[Plan] Using limits for Tier: ${limits.tier} (AI: ${limits.allowAI}, Max Files: ${limits.maxFiles})`);

    // COMPLIANCE: Free tier is for Personal accounts only
    if (limits.tier === PlanTier.FREE && dbInst.accountType === 'Organization') {
      console.info(`[Worker] Skipping job: Free tier does not support Organization accounts (${data.repositoryFullName})`);
      if (dbReviewId) {
        await db.update(reviews).set({
          status: 'completed',
          result: { 
            summary: 'Review skipped. The **Free Tier** supports personal accounts only. Please upgrade to Pro or Team to review organization repositories.',
            comments: [] 
          },
          processedAt: new Date(),
        }).where(eq(reviews.id, dbReviewId));
      }
      return { success: true, reviewerVersion: '0.0.1', contextHash: '', comments: [], summary: 'Review skipped (Org limit on Free)' };
    }

    // Fetch user configuration
    const config = await fetchConfig(gh, data.installationId, owner, repo, data.headSha);
    if (config) {
      console.warn('User configuration loaded successfully.');
    }

    // Load DB-level custom configuration (API keys, custom settings)
    const [dbConfig] = await db.select().from(configs).where(eq(configs.installationId, dbInst.id));
    const hasCustomKey = !!dbConfig?.apiKeyEncrypted;

    // Phase 1.5 - Check for .reviewscopeignore
    let ignoredPatterns: string[] = [];
    try {
      const ignoreContent = await gh.getFileContent(data.installationId, owner, repo, '.reviewscopeignore', data.headSha);
      if (ignoreContent) {
        ignoredPatterns = ignoreContent.split('\n')
          .map(l => l.trim())
          .filter(l => l && !l.startsWith('#'));
        console.warn(`Loaded ${ignoredPatterns.length} patterns from .reviewscopeignore`);
      }
    } catch (e) {
      // Ignore if file doesn't exist
    }

    // Phase 2 - Fetch PR diff
    const diff = await gh.getPullRequestDiff(
      data.installationId,
      owner,
      repo,
      data.prNumber
    );

    // Phase 2 - Parse and filter diff
    const parsedFiles = parseDiff(diff);
    
    // Apply .reviewscopeignore filters
    let initialFiltered = parsedFiles;
    if (ignoredPatterns.length > 0) {
      const isMatch = picomatch(ignoredPatterns, { dot: true });
      initialFiltered = parsedFiles.filter(f => !isMatch(f.path));
      console.warn(`Applied .reviewscopeignore: ${parsedFiles.length} -> ${initialFiltered.length} files`);
    }

    let filteredFiles = filterNoise(initialFiltered);

    console.warn(`Fetched diff: ${parsedFiles.length} files total, ${filteredFiles.length} after noise filtering.`);

    // SMART STRATEGY:
    // If we have actual logic/config files, ignore documentation to save budget.
    // However, if the PR is *ONLY* documentation, we keep it (scoreFile will handle priority, but here we can be aggressive).
    const hasCode = filteredFiles.some(f => scoreFile(f) >= 3); // 3+ is logic/infra
    if (hasCode) {
        // Drop Markdown/Docs if we have real code to review
        filteredFiles = filteredFiles.filter(f => !f.path.endsWith('.md') && !f.path.endsWith('.markdown'));
        console.warn('Code detected: Ignoring documentation files for AI review.');
    }

    // Phase 2b - Scoring and Limiting (LLM Context Budgeting / Plan Limits)
    const MAX_FILES = limits.maxFiles;
    const aiReviewFiles = sortAndLimitFiles(filteredFiles, MAX_FILES);
    
    // Check if we effectively filtered everything out (e.g., only docs were left and we skipped them)
    if (filteredFiles.length === 0 || aiReviewFiles.length === 0) {
      console.warn('Skipping logic: No relevant file changes found for AI.');
      
      if (dbReviewId) {
        await db.update(reviews).set({
          status: 'completed',
          contextHash: 'filtered-empty',
          result: { summary: 'Skipped: No relevant code changes to review.', comments: [] },
          processedAt: new Date(),
        }).where(eq(reviews.id, dbReviewId));
      }

      return {
        success: true,
        reviewerVersion: '0.0.1',
        contextHash: 'filtered-empty',
        comments: [],
        summary: 'Skipped: No relevant code changes to review.',
      };
    }
    
    // Reconstruct diff string for the limited selection
    // Note: We only send the high-priority files to the LLM
    // We send explicit line numbers to help the LLM target comments accurately.
    const optimizedDiff = aiReviewFiles.map(f => {
        let fileDiff = `File: ${f.path}\n`;
        const changes = [
            ...f.additions.map(a => ({ line: a.lineNumber, type: '+', content: a.content })),
            ...f.deletions.map(d => ({ line: d.lineNumber, type: '-', content: d.content }))
        ].sort((a, b) => a.line - b.line);

        changes.forEach(c => {
            fileDiff += `${c.line} ${c.type} ${c.content}\n`;
        });
        return fileDiff;
    }).join('\n\n');

    console.warn(`Sending ${aiReviewFiles.length} files to AI (Selected from ${filteredFiles.length} candidates).`);

    // Phase 8 - Rules Engine
    // Run rules on ALL filtered files (not just the top N) because rules are cheap and deterministic
    const ruleViolations = runRules({ files: filteredFiles }, config);
    const staticComments = ruleViolations.map((v) => ({
      file: v.file,
      line: v.line,
      severity: v.severity,
      body: v.message,
      ruleId: v.ruleId
    }));

    // Phase 7 - Issue Intelligence
    const issueNumbers = parseIssueReferences(data.prBody);
    let issueContext = '';
    if (issueNumbers.length > 0) {
      issueContext = await fetchIssueContext(gh, data.installationId, owner, repo, issueNumbers);
    }

    // Phase 6 - RAG Retrieval
    let ragContext = '';
    if (dbRepo.indexedAt && limits.allowRAG) {
      try {
        const provider = await createConfiguredProvider(dbInst.id);
        
        // Ensure index exists
        const indexer = new RAGIndexer(provider);
        await indexer.ensureCollection();

        const retriever = new RAGRetriever(provider);
        const query = `PR: ${data.prTitle}\nFiles: ${filteredFiles.map(f => f.path).join(', ')}`;
        
        // Use tier-based RAG depth (Free = 2, Pro = 5, Team = 8)
        const results = await retriever.retrieve(data.repositoryId.toString(), query, limits.ragK);
        if (results.length > 0) {
          ragContext = results.map(r => `File: ${r.file}\nRelevant Snippet:\n${r.content}`).join('\n\n');
          console.warn(`[RAG] Retrieved ${results.length} snippets for context.`);
        }
      } catch (e) {
        console.warn('RAG retrieval failed (skipping):', e);
      }
    }

    // Phase 8.5 - Complexity Scoring
    const complexityScore = calculateComplexity(
      filteredFiles.length,
      filteredFiles.map(f => ({
        path: f.path,
        additions: f.additions.map(a => a.content)
      }))
    );
    const complexity = complexityScore.tier;
    console.warn(`[Complexity] Score: ${complexityScore.score}/10 → ${complexity} (${complexityScore.reason})`);

    // Phase 9 - AI Review
    let aiComments: any[] = [];
    let contextHash = 'filtered-empty';
    let aiSummary = 'No AI summary available.';
    let assessment = { riskLevel: 'Low', mergeReadiness: 'Looks Good' };

    // SAAS RULE: Free users MUST provide their own API key to use AI.
    // Pro/Team users can use system keys (depending on your choice) or their own.
    const canRunAI = limits.allowAI && (limits.tier !== PlanTier.FREE || hasCustomKey);

    if (canRunAI) {
      try {
        // SMART BATCHING for Team Tier:
        // If it's a Team plan, we process all files in batches to avoid token limits
        // and ensure a cohesive review.
        const BATCH_SIZE = 25; // Number of files per batch
        const isTeamTier = limits.tier === PlanTier.TEAM;
        
        if (isTeamTier && aiReviewFiles.length > BATCH_SIZE) {
          console.warn(`[Team] Large PR detected (${aiReviewFiles.length} files). Using Smart Batching.`);
          
          const batches: typeof aiReviewFiles[] = [];
          for (let i = 0; i < aiReviewFiles.length; i += BATCH_SIZE) {
            batches.push(aiReviewFiles.slice(i, i + BATCH_SIZE));
          }

          let combinedSummary = '';
          const combinedComments: any[] = [];

          for (let i = 0; i < batches.length; i++) {
            console.warn(`[Team] Processing batch ${i + 1}/${batches.length}...`);
            const batch = batches[i];
            const batchDiff = batch.map(f => {
              let fileDiff = `File: ${f.path}\n`;
              const changes = [
                  ...f.additions.map(a => ({ line: a.lineNumber, type: '+', content: a.content })),
                  ...f.deletions.map(d => ({ line: d.lineNumber, type: '-', content: d.content }))
              ].sort((a, b) => a.line - b.line);
              changes.forEach(c => { fileDiff += `${c.line} ${c.type} ${c.content}\n`; });
              return fileDiff;
            }).join('\n\n');

            const batchResult = await runAIReview({
              installationId: dbInst.id,
              repositoryFullName: data.repositoryFullName,
              prNumber: data.prNumber,
              prTitle: data.prTitle,
              prBody: data.prBody,
              diff: batchDiff,
              issueContext: issueContext,
              ragContext: ragContext,
              ruleViolations: ruleViolations,
              complexity: complexity,
            }, {
              model: config?.ai?.model,
              temperature: config?.ai?.temperature,
              userGuidelines: limits.allowCustomPrompts ? config?.ai?.guidelines : undefined,
            });

            combinedComments.push(...batchResult.comments);
            combinedSummary += `\n\n### Batch ${i + 1} Review\n${batchResult.summary}`;
            
            // For the last batch or a specific one, we can determine the final assessment
            if (i === batches.length - 1) {
              assessment = batchResult.assessment;
              contextHash = batchResult.contextHash;
            }
          }

          aiComments = combinedComments;
          aiSummary = `### 🤝 Team Smart Batching Review\nAutomated review for ${aiReviewFiles.length} files split into ${batches.length} logical chunks.\n${combinedSummary}`;
        } else {
          // Standard Review (Free/Pro or Single-Batch Team)
          const aiResult = await runAIReview({
            installationId: dbInst.id,
            repositoryFullName: data.repositoryFullName,
            prNumber: data.prNumber,
            prTitle: data.prTitle,
            prBody: data.prBody,
            diff: optimizedDiff, 
            issueContext: issueContext,
            ragContext: ragContext,
            ruleViolations: ruleViolations,
            complexity: complexity,
          }, {
            model: config?.ai?.model,
            temperature: config?.ai?.temperature,
            userGuidelines: limits.allowCustomPrompts ? config?.ai?.guidelines : undefined,
          });

          contextHash = aiResult.contextHash;
          aiSummary = aiResult.summary;
          aiComments = aiResult.comments;
          assessment = aiResult.assessment;
        }
      } catch (e) {
        console.error('AI Review failed:', e);
      }
    } else {

      // Free Tier (No Key) or Restricted Tier: Static only analysis
      const issuesFound = staticComments.length;
      
      if (limits.tier === PlanTier.FREE && !hasCustomKey && limits.allowAI) {
        aiSummary = `### 🤖 AI Review Paused\nYou are on the **Free Plan**. To enable deep logic reviews, please add your own Gemini or OpenAI API key in the [ReviewScope Dashboard](${process.env.DASHBOARD_URL || '#'}).\n\n**Current Static Results:** Identified ${issuesFound} patterns.`;
      } else {
        aiSummary = issuesFound > 0 
          ? `Static analysis identified ${issuesFound} issues in core code. Upgrade to the Pro plan for deep logic and security review using AI.`
          : "Static checks passed. No immediate pattern violations found.";
      }
      
      contextHash = 'static-only-' + Date.now();
      assessment = { 
        riskLevel: issuesFound > 5 ? 'Medium' : 'Low', 
        mergeReadiness: issuesFound > 0 ? 'Needs Changes' : 'Looks Good' 
      };
      
      console.warn(`[Plan] Skipping AI review phase for ${limits.tier} installation ${dbInst.id} (Has Key: ${hasCustomKey})`);
    }

    // Phase 10 - Post to GitHub
    const criticals = aiComments.filter(c => c.severity === 'CRITICAL');
    const majors = aiComments.filter(c => c.severity === 'MAJOR');
    const minors = aiComments.filter(c => c.severity === 'MINOR');
    const infos = aiComments.filter(c => c.severity === 'INFO');

    // FORCE: If no criticals, merge readiness is at least "Needs Changes" unless specifically approved
    let mergeReadinessDisplay = assessment.mergeReadiness;
    if (criticals.length === 0 && assessment.mergeReadiness === 'Blocked') {
        mergeReadinessDisplay = 'Needs Changes';
    }
    if (criticals.length === 0 && majors.length === 0) {
        mergeReadinessDisplay = 'Looks Good';
    }

    const mergeReadyEmoji = mergeReadinessDisplay === 'Looks Good' ? '✅ Ready' : (mergeReadinessDisplay === 'Blocked' ? '❌ Blocked' : '⚠️ Needs Changes');

    let summaryBody = `## 🤖 ReviewScope AI Review

### 🔍 Overall Assessment
- **Risk Level:** ${assessment.riskLevel}
- **Merge Readiness:** ${mergeReadyEmoji}

### 📝 Summary
${aiSummary}
`;

    if (criticals.length > 0) {
        summaryBody += `\n### 🚨 Blocking Issues (${criticals.length})\n`;
        criticals.forEach((c) => {
            summaryBody += `- **${c.message}** in \`${c.file}\`\n`;
        });
    }

    if (majors.length > 0) {
        summaryBody += `\n### ⚠️ Should Fix Before Release (${majors.length})\n`;
        majors.forEach((c) => {
            summaryBody += `- ${c.message} in \`${c.file}\`\n`;
        });
    }

    if (minors.length > 0 || infos.length > 0) {
        summaryBody += `\n### ℹ️ Optional Improvements (${minors.length + infos.length})\n`;
        [...minors, ...infos].slice(0, 5).forEach((c) => {
            summaryBody += `- ${c.message} (${c.severity})\n`;
        });
        if (minors.length + infos.length > 5) {
            summaryBody += `- ... and ${minors.length + infos.length - 5} more.\n`;
        }
    }

    summaryBody += `
\n### 🧠 Reviewer Notes
- Review focused on runtime safety, security, and correctness.
- Non-runtime suggestions or stylistic nits were intentionally down-prioritized or ignored.

<details>
<summary>Metadata</summary>
Context Hash: ${contextHash}
Reviewer Version: 0.1.0
</details>
    `.trim();

    // Unified list of all issues with keys
    const allFindings = [
      ...staticComments.map(c => ({
        ...c,
        source: 'static' as const,
        issueKey: generateIssueKey({
            repositoryId: dbRepo.id,
            prNumber: data.prNumber,
            filePath: c.file,
            ruleId: c.ruleId || 'static-violation',
            message: c.body
        })
      })),
      ...aiComments.map(c => ({
        ...c,
        source: 'ai' as const,
        issueKey: generateIssueKey({
            repositoryId: dbRepo.id,
            prNumber: data.prNumber,
            filePath: c.file,
            ruleId: 'ai-review',
            message: c.message
        })
      }))
    ];

    // Idempotency: Get existing threads for this PR to avoid duplicates
    const existingThreads = await db
        .select({
            id: commentThreads.id,
            issueKey: commentThreads.issueKey,
            status: commentThreads.status
        })
        .from(commentThreads)
        .innerJoin(reviews, eq(commentThreads.reviewId, reviews.id))
        .where(
            and(
                eq(reviews.repositoryId, dbRepo.id),
                eq(reviews.prNumber, data.prNumber),
                eq(commentThreads.status, 'open')
            )
        ); 
    
    const githubComments = [];
    const dbComments = [];

    for (const finding of allFindings) {
      const alreadyReported = existingThreads.some(t => t.issueKey === finding.issueKey);
      if (alreadyReported) continue;

      // Add to GitHub batch
      if (finding.source === 'static') {
        githubComments.push({
          path: finding.file,
          line: finding.line,
          side: 'RIGHT' as const,
          body: `**[STATIC] ${finding.severity.toUpperCase()}:** ${finding.body}`
        });

        dbComments.push({
           file: finding.file,
           line: finding.line,
           severity: finding.severity.toUpperCase(),
           message: finding.body,
           why: 'Detected by static analysis rules.',
           fix: undefined,
           issueKey: finding.issueKey
        });
      } else {
        const emojiMap: Record<string, string> = {
          CRITICAL: '🔴',
          MAJOR: '🟠',
          MINOR: '🟡',
          INFO: 'ℹ️',
        };
        const emoji = emojiMap[finding.severity] || '⚠️';
        
        let body = `### ${emoji} ${finding.severity} | ${finding.message}\n\n`;
        if (finding.why) body += `${finding.why}\n\n`;
        if (finding.diff) {
          body += `<details>\n<summary>🔍 <b>Proposed Fix:</b> ${finding.fix || 'View Changes'}</summary>\n\n\`\`\`diff\n${finding.diff}\n\`\`\`\n</details>\n\n`;
        } else if (finding.fix) {
          body += `**Suggested Fix:** ${finding.fix}\n\n`;
        }
        if (finding.suggestion) {
          body += `\`\`\`suggestion\n${finding.suggestion}\n\`\`\``;
        }

        githubComments.push({
          path: finding.file,
          line: finding.endLine || finding.line,
          start_line: finding.endLine && finding.endLine !== finding.line ? finding.line : undefined,
          side: 'RIGHT' as const, 
          body,
        });

        dbComments.push({ ...finding });
      }
    }

    // Identify Resolved issues (In DB as 'open' but no longer in current findings)
    const currentKeys = new Set(allFindings.map(f => f.issueKey));
    const resolvedThreads = existingThreads.filter(t => !currentKeys.has(t.issueKey));
    
    if (resolvedThreads.length > 0) {
        console.warn(`[Worker] Resolving ${resolvedThreads.length} threads.`);
        // Mark as resolved in DB
        for (const thread of resolvedThreads) {
            await db.update(commentThreads).set({ 
                status: 'resolved',
                updatedAt: new Date()
            }).where(eq(commentThreads.id, thread.id));
        }
    }

    // Validate comments to avoid 422 errors
    const validatedComments = githubComments.filter(c => {
        const file = parsedFiles.find(f => f.path === c.path);
        if (!file) return false;
        
        // GitHub API only allows comments on lines that are part of the diff (hunks)
        const side = c.side || 'RIGHT';
        const hunk = file.hunks.find(h => {
             if (side === 'RIGHT') {
                 return c.line >= h.newStart && c.line < h.newStart + h.newLines;
             } else {
                 return c.line >= h.oldStart && c.line < h.oldStart + h.oldLines;
             }
        });
        return !!hunk;
    });

    if (validatedComments.length < githubComments.length) {
        console.warn(`[Worker] Filtered out ${githubComments.length - validatedComments.length} invalid or duplicated comments.`);
    }

    if (validatedComments.length > 0) {
      await gh.postReview(
        data.installationId,
        owner,
        repo,
        data.prNumber,
        data.headSha,
        summaryBody,
        validatedComments
      );
    }

    // Update DB with new findings and threads
    if (dbReviewId) {
      // 1. Record Threads for new comments
      const newFindingsWithNewKeys = allFindings.filter(f => !existingThreads.some(t => t.issueKey === f.issueKey));
      if (newFindingsWithNewKeys.length > 0) {
          await db.insert(commentThreads).values(newFindingsWithNewKeys.map(f => ({
              reviewId: dbReviewId!,
              issueKey: f.issueKey,
              filePath: f.file,
              line: f.line,
              status: 'open' as const,
          })));
      }

      await db.update(reviews).set({
        status: 'completed',
        contextHash: contextHash,
        result: { summary: aiSummary, assessment, comments: dbComments },
        processedAt: new Date(),
      }).where(eq(reviews.id, dbReviewId));
    }

    return {
      success: true,
      reviewerVersion: '0.0.1',
      contextHash: contextHash,
      comments: [], // Return empty as we handled posting
      summary: aiSummary,
    };
  } catch (err) {
    console.error(`Failed to process review job for PR #${data.prNumber}:`, err);
    if (dbReviewId) {
      await db.update(reviews).set({
        status: 'failed',
        error: (err as Error).message,
        processedAt: new Date(),
      }).where(eq(reviews.id, dbReviewId));
    }
    throw err;
  }
}