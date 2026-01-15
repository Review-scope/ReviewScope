import { db, repositories } from './apps/api/src/db/index.js';
import { eq } from 'drizzle-orm';

async function check() {
  try {
    const repo = await db.select().from(repositories).where(eq(repositories.githubRepoId, 940112361)).limit(1);
    console.log(JSON.stringify(repo, null, 2));
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

check();
