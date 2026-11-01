# V2: Enterprise RAG with PostgreSQL + pgvector

Video: [Enterprise RAG with PostgreSQL + pgvector for AI Agents](https://www.youtube.com/watch?v=HlT40sMLex0)

Embeddings live next to the data they describe: one database, one transaction, one query, and row-level security for tenants.

```
updateDocument() ── one transaction: UPDATE doc · DELETE old chunks · INSERT outbox
                                                     ↓
                   outbox-relay → BullMQ → embedding worker → split · embed · replaceChunks (if the doc didn't change again)

retrieve() ── embed question → one SQL query: similarity + RLS tenant + status + metadata → distance cutoff
```

| File | What it does |
|---|---|
| `sql/schema.sql` | Docs, outbox, chunks with `vector(1536)`, HNSW index, row-level security |
| `src/retrieve.ts` | Retrieval in one query, scoped to the tenant |
| `src/update-document.ts` | The change and its outbox event in the same transaction |
| `src/outbox-relay.ts` | Moves outbox rows to the queue (`FOR UPDATE SKIP LOCKED`) |
| `src/embedding.worker.ts` | Re-chunks and re-embeds outside the transaction |
| `src/docs.ts` | `replaceChunks` with the stale-write guard |

## Run it

```bash
cp .env.example .env
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres pgvector/pgvector:pg17
docker run -d -p 6379:6379 valkey/valkey
npm install
npm run migrate        # as a role that can create extensions, then connect the app as a non-owner role
npm run relay          # terminal 1
npm run worker         # terminal 2
npm run ask -- <tenant-uuid> "What is the termination fee?"
```

Insert documents with `updateDocument()` (or insert into `enterprise_docs` and add a `doc.changed` row to `outbox`).
