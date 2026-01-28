import { Hono } from 'hono';
import { enqueueIndexingJob } from '../lib/queue.js';
import { db, repositories, installations } from '../db/index.js';
import { eq } from 'drizzle-orm';

export const jobRoutes = new Hono();

jobRoutes.post('/index/:repoId', async (c) => {
  const repoId = c.req.param('repoId');
  
  try {
    // Fetch repo and installation info
    const [repo] = await db
      .select({
        id: repositories.id,
        githubRepoId: repositories.githubRepoId,
        fullName: repositories.fullName,
        installationId: repositories.installationId,
      })
      .from(repositories)
      .where(eq(repositories.id, repoId))
      .limit(1);

    if (!repo) {
      return c.json({ error: 'Repository not found' }, 404);
    }

    const [inst] = await db
      .select({
        githubInstallationId: installations.githubInstallationId,
      })
      .from(installations)
      .where(eq(installations.id, repo.installationId))
      .limit(1);

    if (!inst) {
      return c.json({ error: 'Installation not found' }, 404);
    }

    await enqueueIndexingJob({
      installationId: inst.githubInstallationId,
      repositoryId: repo.githubRepoId,
      repositoryFullName: repo.fullName,
    });

    return c.json({ success: true, message: 'Indexing job enqueued' });
  } catch (err: unknown) {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    console.error('Failed to enqueue indexing job:', (err as any).message || err);
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    return c.json({ error: (err as any).message || 'Unknown error' }, 500);
  }
});
