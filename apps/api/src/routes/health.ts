import { Hono } from 'hono';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';
import { Redis } from 'ioredis';

export const healthRoutes = new Hono();

healthRoutes.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

healthRoutes.get('/ready', async (c) => {
  const checks: Record<string, { status: 'ok' | 'error'; latency?: number; error?: string }> = {};
  let allHealthy = true;

  // Database check
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    checks.database = { status: 'ok', latency: Date.now() - start };
  } catch (error) {
    checks.database = { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    allHealthy = false;
  }

  // Redis check
  try {
    const start = Date.now();
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
    });
    await redis.connect();
    await redis.ping();
    await redis.quit();
    checks.redis = { status: 'ok', latency: Date.now() - start };
  } catch (error) {
    checks.redis = { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    allHealthy = false;
  }

  // Qdrant check (optional - don't fail if not configured)
  if (process.env.QDRANT_URL) {
    try {
      const start = Date.now();
      const response = await fetch(`${process.env.QDRANT_URL}/collections`, {
        headers: process.env.QDRANT_API_KEY ? { 'api-key': process.env.QDRANT_API_KEY } : {},
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        checks.qdrant = { status: 'ok', latency: Date.now() - start };
      } else {
        checks.qdrant = { status: 'error', error: `HTTP ${response.status}` };
        allHealthy = false;
      }
    } catch (error) {
      checks.qdrant = { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
      allHealthy = false;
    }
  }

  // Configuration check
  const requiredEnvVars = [
    'DATABASE_URL',
    'REDIS_URL',
    'GITHUB_WEBHOOK_SECRET',
    // Add other critical env vars here
  ];

  checks.config = { status: 'ok' };
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    checks.config = { 
      status: 'error', 
      error: `Missing environment variables: ${missingVars.join(', ')}` 
    };
    allHealthy = false;
  }

  return c.json({
    ready: allHealthy,
    checks,
    timestamp: new Date().toISOString(),
  }, allHealthy ? 200 : 503);
});
