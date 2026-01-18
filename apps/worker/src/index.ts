import { Worker } from 'bullmq';
import { processReviewJob } from './jobs/review.js';
import { processIndexingJob } from './jobs/index.js';
import { processChatJob } from './jobs/chat.js';
import type { ReviewJobData } from './jobs/review.js';
import type { IndexingJobData } from './jobs/index.js';
import type { ChatJobData } from './jobs/chat.js';
import http from 'http';

// Handle uncaught connection errors gracefully (ECONNRESET from idle connections)
process.on('uncaughtException', (err) => {
  // Ignore ECONNRESET - these are expected when idle connections are closed by remote
  if ((err as any).code === 'ECONNRESET') {
    console.warn('⚠️ Connection reset (idle connection closed by remote) - continuing...');
    return;
  }
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  // Ignore ECONNRESET rejections
  if ((reason as any)?.code === 'ECONNRESET') {
    console.warn('⚠️ Connection reset in promise - continuing...');
    return;
  }
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});


let workerInstance: Worker | null = null;
let indexWorkerInstance: Worker | null = null;
let chatWorkerInstance: Worker | null = null;
let httpServer: http.Server | null = null;

export async function startWorker() {
  if (workerInstance) return workerInstance;

  const redisUrl = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
  const connection = {
    host: redisUrl.hostname,
    port: Number(redisUrl.port),
    password: redisUrl.password,
    tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,
  };

  console.warn('🔧 Initializing ReviewScope Review Worker...');
  workerInstance = new Worker<ReviewJobData>(
    'review-jobs',
    async (job) => {
      console.warn(`📝 Processing review job ${job.id} for PR #${job.data.prNumber}`);
      return processReviewJob(job.data);
    },
    { connection, concurrency: 5 }
  );

  console.warn('🔧 Initializing ReviewScope Indexing Worker...');
  indexWorkerInstance = new Worker<IndexingJobData>(
    'indexing-jobs',
    async (job) => {
      console.warn(`📝 Processing indexing job ${job.id} for ${job.data.repositoryFullName}`);
      return processIndexingJob(job.data);
    },
    { connection, concurrency: 2 }
  );

  console.warn('🔧 Initializing ReviewScope Chat Worker...');
  chatWorkerInstance = new Worker<ChatJobData>(
    'chat-jobs',
    async (job) => {
      console.warn(`📝 Processing chat job ${job.id} for PR #${job.data.prNumber}`);
      return processChatJob(job.data);
    },
    { connection, concurrency: 3 }
  );

  // Status Listeners
  workerInstance.on('active', (job) => console.warn(`🔥 Review Job ${job.id} ACTIVE`));
  indexWorkerInstance.on('active', (job) => console.warn(`🔥 Indexing Job ${job.id} ACTIVE`));
  chatWorkerInstance.on('active', (job) => console.warn(`🔥 Chat Job ${job.id} ACTIVE`));

  workerInstance.on('completed', (job) => console.warn(`✅ Review Job ${job.id} completed`));
  indexWorkerInstance.on('completed', (job) => console.warn(`✅ Indexing Job ${job.id} completed`));
  chatWorkerInstance.on('completed', (job) => console.warn(`✅ Chat Job ${job.id} completed`));

  workerInstance.on('failed', (job, err) => console.error(`❌ Review Job ${job?.id} failed:`, err.message));
  indexWorkerInstance.on('failed', (job, err) => console.error(`❌ Indexing Job ${job?.id} failed:`, err.message));
  chatWorkerInstance.on('failed', (job, err) => console.error(`❌ Chat Job ${job?.id} failed:`, err.message));

  // Handle connection errors gracefully
  const handleConnectionError = (workerName: string, err: Error) => {
    // Suppress noise from idle connection resets which are common and handled by auto-reconnect
    if ((err as any).code === 'ECONNRESET') {
      return; 
    }
    console.error(`${workerName} error [${(err as any).code || 'NO_CODE'}]:`, err.message || err.toString());
  };

  workerInstance.on('error', (err) => handleConnectionError('Review Worker', err));
  indexWorkerInstance.on('error', (err) => handleConnectionError('Indexing Worker', err));
  chatWorkerInstance.on('error', (err) => handleConnectionError('Chat Worker', err));

  await workerInstance.waitUntilReady();
  await indexWorkerInstance.waitUntilReady();
  await chatWorkerInstance.waitUntilReady();

  console.warn('🚀 All ReviewScope Workers started');
  const portNum = Number(process.env.PORT) || 3001;
  
  httpServer = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        service: 'ReviewScope Worker',
        timestamp: new Date().toISOString()
      }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  httpServer.listen(portNum, '0.0.0.0', () => {
    console.warn(`🚀 Worker Health Server running on port ${portNum}`);
  });
  return workerInstance;
}

// Start the worker
startWorker().catch(err => {
  console.error('Failed to start worker:', err);
  process.exit(1);
});


// Graceful shutdown
process.on('SIGTERM', async () => {
  console.warn('Shutting down workers...');
  await workerInstance?.close();
  await indexWorkerInstance?.close();
  await chatWorkerInstance?.close();
  if (httpServer) {
    await new Promise<void>((resolve) => httpServer!.close(() => resolve()));
  }
  process.exit(0);
});
