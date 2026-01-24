import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../../api/src/db/schema';

const connectionString = process.env.DATABASE_URL || '';
// console.log('Dashboard CWD:', process.cwd());
// console.log('Dashboard DB Connection String:', connectionString ? 'PRESENT' : 'MISSING');

const client = postgres(connectionString);
export const db = drizzle(client, { schema });

// Explicitly export table schemas to satisfy Turbopack static analysis
export * from '../../../api/src/db/schema';