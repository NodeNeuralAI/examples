import { db } from './db.js';
import { embeddings } from './queue.js';

// Moves committed outbox rows to the queue. SKIP LOCKED lets several relays run side by side;
// the job id makes a row that is relayed twice (crash after add, before commit) a no-op.
async function relayBatch() {
  return db.transaction(async (tx) => {
    const { rows } = await tx.query<{ id: string; doc_id: string }>(
      'SELECT id, doc_id FROM outbox WHERE processed_at IS NULL ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED',
    );
    for (const row of rows) {
      await embeddings.add('doc.changed', { docId: row.doc_id }, { jobId: `outbox-${row.id}` });
    }
    if (rows.length) await tx.query('UPDATE outbox SET processed_at = now() WHERE id = ANY($1)', [rows.map((r) => r.id)]);
    return rows.length;
  });
}

console.log('Outbox relay started');
for (;;) {
  const moved = await relayBatch();
  if (moved === 0) await new Promise((r) => setTimeout(r, 1_000));
}
