import { config } from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from monorepo root
// When running from src: apps/worker/src -> apps/worker -> apps -> root (3 levels)
config({ path: resolve(__dirname, '../../../.env') });

// When running from dist: apps/worker/dist/apps/worker/src -> ... -> root (6 levels)
config({ path: resolve(__dirname, '../../../../../../.env') });
