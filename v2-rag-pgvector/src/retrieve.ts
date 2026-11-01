import { db, setTenant } from './db.js';
import { embed, toSql } from './embed.js';

// One SQL query: similarity, permissions (RLS), document status and metadata together.
export async function retrieve(tenantId: string, question: string) {
  const embedding = await embed(question);

  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId);

    const { rows } = await tx.query<{ content: string; title: string; distance: number }>(
      `SELECT c.content, d.title, c.embedding <=> $1 AS distance
         FROM doc_chunks c
         JOIN enterprise_docs d ON d.id = c.doc_id
        WHERE d.status = 'active' AND c.embedding IS NOT NULL
        ORDER BY c.embedding <=> $1
        LIMIT 5`,
      [toSql(embedding)],
    );

    // Cosine distance: lower is closer. Past the cutoff, "nothing relevant" beats a weak match.
    return rows.filter((r) => r.distance < 0.35);
  });
}
