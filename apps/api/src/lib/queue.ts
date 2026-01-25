import { Queue } from 'bullmq';
import { assertRepoQuotaByGithubInstallationId } from './quota.js';

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

export interface IndexingJobData {
  installationId: number;
  repositoryId: number;
  repositoryFullName: string;
}

export interface ChatJobData {
  installationId: number;
  repositoryId: number;
  repositoryFullName: string;
  prNumber: number;
  userQuestion: string;
  commentId: number;
  commentType: 'issue' | 'review';
}

let reviewQueueInstance: Queue<ReviewJobData> | null = null;
let indexingQueueInstance: Queue<IndexingJobData> | null = null;
let chatQueueInstance: Queue<ChatJobData> | null = null;

export function getReviewQueue() {
  if (!reviewQueueInstance) {
    const redisUrl = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
    reviewQueueInstance = new Queue<ReviewJobData>('review-jobs', {
      connection: {
        host: redisUrl.hostname,
        port: Number(redisUrl.port),
        password: redisUrl.password,
        tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
        maxRetriesPerRequest: null,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return reviewQueueInstance;
}

export function getIndexingQueue() {
  if (!indexingQueueInstance) {
    const redisUrl = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
    indexingQueueInstance = new Queue<IndexingJobData>('indexing-jobs', {
      connection: {
        host: redisUrl.hostname,
        port: Number(redisUrl.port),
        password: redisUrl.password,
        tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
        maxRetriesPerRequest: null,
      },
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 10,
        removeOnFail: 100,
      },
    });
  }
  return indexingQueueInstance;
}

export function getChatQueue() {
  if (!chatQueueInstance) {
    const redisUrl = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
    chatQueueInstance = new Queue<ChatJobData>('chat-jobs', {
      connection: {
        host: redisUrl.hostname,
        port: Number(redisUrl.port),
        password: redisUrl.password,
        tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
        maxRetriesPerRequest: null,
      },
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return chatQueueInstance;
}

export async function enqueueReviewJob(data: ReviewJobData): Promise<string> {
  const queue = getReviewQueue();
  const jobId = `review-${data.repositoryId}-${data.prNumber}-${Date.now()}`;
  const job = await queue.add('process-review', data, { jobId });
  console.warn(`[Queue] Enqueued Review Job: ${jobId}`);
  return job.id || jobId;
}

export async function enqueueIndexingJob(data: IndexingJobData): Promise<string> {
  const queue = getIndexingQueue();
  const jobId = `index-${data.repositoryId}-${Date.now()}`;
  console.warn(`[Queue] Attempting to enqueue Indexing Job: ${jobId} for repo ${data.repositoryFullName}`);
  try {
    // Enforce repository quota before enqueuing indexing
    await assertRepoQuotaByGithubInstallationId(data.installationId);
    const job = await queue.add('process-indexing', data, { jobId });
    console.warn(`[Queue] Successfully enqueued Indexing Job: ${job.id}`);
    return job.id || jobId;
  } catch (err: unknown) {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    console.error(`[Queue] Failed to enqueue Indexing Job: ${(err as any).message}`);
    throw err;
  }
}

export async function enqueueChatJob(data: ChatJobData): Promise<string> {
  const queue = getChatQueue();
  const jobId = `chat-${data.commentId}`;
  const job = await queue.add('process-chat', data, { jobId });
  console.warn(`[Queue] Enqueued Chat Job: ${jobId}`);
  return job.id || jobId;
}