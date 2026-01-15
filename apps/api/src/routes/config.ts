import { Hono } from 'hono';

export const configRoutes = new Hono();

// Placeholder for user configuration endpoints
// Will be implemented in Phase 11

configRoutes.get('/', (c) => {
  return c.json({ message: 'Configuration endpoints - Phase 11' });
});
