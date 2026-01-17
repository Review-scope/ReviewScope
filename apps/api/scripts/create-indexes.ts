
import { QdrantClient } from '@qdrant/js-client-rest';
import path from 'path';

const url = process.env.QDRANT_URL;
const apiKey = process.env.QDRANT_API_KEY;

if (!url || !apiKey) {
    console.error('Missing QDRANT_URL or QDRANT_API_KEY');
    process.exit(1);
}

const client = new QdrantClient({ url, apiKey });
const COLLECTION_NAME = 'reviewscope_repos';

async function createIndexes() {
    try {
        console.log(`Creating indexes for ${COLLECTION_NAME}...`);
        
        // Index installationId (UUID)
        await client.createPayloadIndex(COLLECTION_NAME, {
            field_name: 'installationId',
            field_schema: 'keyword', // Using keyword as it handles string UUIDs safely
        });
        console.log('✅ Created index for installationId');

        // Index repoId (Keyword/String)
        await client.createPayloadIndex(COLLECTION_NAME, {
            field_name: 'repoId',
            field_schema: 'keyword',
        });
        console.log('✅ Created index for repoId');

    } catch (err) {
        console.error('Failed to create indexes:', err);
    }
}

createIndexes();
