import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { healthRoutes } from './routes/health.js';
import { configRoutes } from './routes/config.js';
import { jobRoutes } from './routes/jobs.js';
import { githubWebhook } from './webhooks/github.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Routes
app.route('/health', healthRoutes);
app.route('/webhooks/github', githubWebhook);
app.route('/api/v1/config', configRoutes);
app.route('/api/v1/jobs', jobRoutes);

// Root
app.get('/', (c) => c.json({ name: 'ReviewScope API', version: '0.0.1' }));

const port = Number(process.env.PORT) || 3000;

console.warn(`🚀 ReviewScope API running on port ${port}`);

const server = serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
});

const shutdown = () => {
  console.log('Shutting down API server...');
  server.close(() => {
    console.log('API server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
