import { db, setTenant } from './db.js';
import { toSql } from './embed.js';

export const docs = {
  async get(id: string) {
    const { rows } = await db.query<{ id: string; tenantId: string; content: string; updatedAt: string }>(
      // As text: JavaScript dates drop the microseconds that Postgres keeps, and the comparison below must be exact.
      'SELECT id, tenant_id AS "tenantId", content, updated_at::text AS "updatedAt" FROM enterprise_docs WHERE id = $1',
      [id],
    );
    return rows[0] ?? null;
  },

  // Writes the new chunks only if the document is still the version that was embedded. If it changed while
  // the worker was busy, a newer outbox event is already on its way, so this one is skipped.
  async replaceChunks(id: string, updatedAt: string, chunks: string[], vectors: number[][]) {
    return db.transaction(async (tx) => {
      const { rows } = await tx.query<{ tenant_id: string }>(
        'SELECT tenant_id FROM enterprise_docs WHERE id = $1 AND updated_at::text = $2 FOR UPDATE',
        [id, updatedAt],
      );
      if (!rows[0]) return false;
      await setTenant(tx, rows[0].tenant_id);
      await tx.query('DELETE FROM doc_chunks WHERE doc_id = $1', [id]);
      for (const [i, content] of chunks.entries()) {
        await tx.query('INSERT INTO doc_chunks (doc_id, tenant_id, content, embedding) VALUES ($1, $2, $3, $4)', [
          id, rows[0].tenant_id, content, toSql(vectors[i]),
        ]);
      }
      return true;
    });
  },
};
