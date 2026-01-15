import { GitHubClient } from '../lib/github.js';
import { RAGIndexer } from '@reviewscope/context-engine';
import { createConfiguredProvider } from '../lib/ai-review.js';
import { db, repositories, installations, configs } from '../../../api/src/db/index.js';
import { eq } from 'drizzle-orm';
import { getPlanLimits } from '../lib/plans.js';

export interface IndexingJobData {
  installationId: number;
  repositoryId: number;
  repositoryFullName: string;
}

const gh = new GitHubClient();

export async function processIndexingJob(data: IndexingJobData): Promise<void> {
  console.warn(`🔄 Starting indexing for ${data.repositoryFullName}`);

  const [owner, repo] = data.repositoryFullName.split('/');

  try {
    // 0. Get DB context (Installation)
    const [dbInst] = await db.select().from(installations).where(eq(installations.githubInstallationId, data.installationId));
    if (!dbInst) {
      console.info(`[Worker] Skipping index job: installation ${data.installationId} not found`);
      return;
    }
    
    // Check installation status
    if (dbInst.status !== 'active') {
      console.info(`[Worker] Skipping index job: installation ${data.installationId} is ${dbInst.status}`);
      return;
    }

    // Get repository and check status
    const [dbRepo] = await db.select().from(repositories).where(eq(repositories.githubRepoId, data.repositoryId));
    if (!dbRepo) {
      console.info(`[Worker] Skipping index job: repository ${data.repositoryId} not found`);
      return;
    }
    
    // COMPLIANCE: Must not index removed/deleted repos
    if (dbRepo.status !== 'active') {
      console.info(`[Worker] Skipping index job: repository ${data.repositoryFullName} is ${dbRepo.status}`);
      return;
    }

    // SAAS RULE: Check if plan allows RAG
    const limits = getPlanLimits(dbInst.planId);
    if (!limits.allowRAG) {
      console.warn(`[Index] Skipping: Plan ${limits.tier} does not include RAG indexing for ${data.repositoryFullName}`);
      return;
    }

    // SAAS RULE 2: Index only after API key exists (Don't use server credits for user indexing)
    const [userConfig] = await db.select().from(configs).where(eq(configs.installationId, dbInst.id));
    if (!userConfig?.apiKeyEncrypted) {
      console.warn(`[Index] Skipping: No custom API key provided by user for installation ${dbInst.id}. (Required for RAG)`);
      return;
    }

    console.warn(`[Index] Found DB installation: ${dbInst.id} for GitHub installation: ${data.installationId}`);

    // 1. Fetch all relevant files from repository
    const files = await gh.getRepositoryFiles(data.installationId, owner, repo);
    
    // 2. Setup RAG Indexer
    const llmProvider = await createConfiguredProvider(dbInst.id);
    const indexer = new RAGIndexer(llmProvider);

    // 3. Index into Qdrant
    console.warn(`Indexing ${files.length} files into vector database...`);
    const indexedCount = await indexer.indexRepository(
      data.repositoryId.toString(), 
      dbInst.id, // Internal DB UUID
      files
    );
    
    console.warn(`✅ Indexed ${indexedCount} chunks for ${data.repositoryFullName}`);

    // 4. Mark repository as indexed in DB
    await db.update(repositories).set({
      indexedAt: new Date(),
    }).where(eq(repositories.githubRepoId, data.repositoryId));

  } catch (err) {
    console.error(`❌ Failed to index repository ${data.repositoryFullName}:`, err);
    throw err;
  }
}
