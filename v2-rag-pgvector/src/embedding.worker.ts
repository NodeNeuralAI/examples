import { Worker } from 'bullmq';
import { docs } from './docs.js';
import { embedMany } from './embed.js';
import { connection } from './queue.js';
import { split } from './split.js';

// The embedding worker does the slow part outside the transaction.
new Worker<{ docId: string }>(
  'embeddings',
  async (job) => {
    const doc = await docs.get(job.data.docId);
    if (!doc) return; // deleted: its chunks went with it

    const chunks = split(doc.content, { maxTokens: 500, overlap: 50 });
    const vectors = await embedMany(chunks);

    await docs.replaceChunks(doc.id, doc.updatedAt, chunks, vectors); // skipped if the doc changed
  },
  { connection, concurrency: 4 },
);

console.log('Embedding worker started');
