import { Hono } from 'hono';
import { getRepoQuotaByInstallationId, getRepoQuotaByGithubInstallationId } from '../lib/quota.js';

export const configRoutes = new Hono();

// Placeholder for user configuration endpoints
// Will be implemented in Phase 11

configRoutes.get('/', (c) => c.json({ message: 'Configuration endpoints - Phase 11' }));

configRoutes.get('/quota/:installationId', async (c) => {
  const installationId = c.req.param('installationId');
  try {
    const quota = await getRepoQuotaByInstallationId(installationId);
    return c.json(quota);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  } catch (err: any) {
    return c.json({ error: err.message, code: err.code }, err.status || 500);
  }
});

configRoutes.get('/quota/github/:githubInstallationId', async (c) => {
  const githubInstallationIdStr = c.req.param('githubInstallationId');
  const githubInstallationId = parseInt(githubInstallationIdStr, 10);
  if (Number.isNaN(githubInstallationId)) {
    return c.json({ error: 'Invalid githubInstallationId' }, 400);
  }
  try {
    const quota = await getRepoQuotaByGithubInstallationId(githubInstallationId);
    return c.json(quota);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  } catch (err: any) {
    return c.json({ error: err.message, code: err.code }, err.status || 500);
  }
});
