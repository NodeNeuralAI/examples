import { db, setTenant } from './db.js';

// The change and its event commit together: there is no moment where the document changed
// but nobody knows its embeddings are stale. Old chunks go immediately, so retrieval never
// serves the previous version; the document is unsearchable for the few seconds until the worker runs.
export async function updateDocument(tenantId: string, id: string, content: string) {
  await db.transaction(async (tx) => {
    await setTenant(tx, tenantId);
    await tx.query('UPDATE enterprise_docs SET content = $2, updated_at = now() WHERE id = $1 AND tenant_id = $3', [
      id, content, tenantId,
    ]);
    await tx.query('DELETE FROM doc_chunks WHERE doc_id = $1', [id]);
    await tx.query("INSERT INTO outbox (topic, doc_id) VALUES ('doc.changed', $1)", [id]);
  });
}
