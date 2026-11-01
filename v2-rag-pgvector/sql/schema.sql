CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS enterprise_docs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL,
  title      text NOT NULL,
  content    text NOT NULL,
  status     text NOT NULL DEFAULT 'active',  -- 'active' | 'archived'
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Written in the same transaction as the change; a relay moves it to the queue.
CREATE TABLE IF NOT EXISTS outbox (
  id           bigserial PRIMARY KEY,
  topic        text NOT NULL,
  doc_id       uuid NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX IF NOT EXISTS outbox_pending ON outbox (id) WHERE processed_at IS NULL;

CREATE TABLE IF NOT EXISTS doc_chunks (
  id        bigserial PRIMARY KEY,
  doc_id    uuid NOT NULL REFERENCES enterprise_docs(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  content   text NOT NULL,
  embedding vector(1536)
);

CREATE INDEX IF NOT EXISTS doc_chunks_embedding ON doc_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS doc_chunks_doc ON doc_chunks (doc_id);

-- RLS: every query sees only the tenant set in app.tenant_id for the current transaction.
-- Table owners bypass RLS unless it is FORCEd, so FORCE it and still connect as a non-owner role.
-- The second argument of current_setting makes a missing tenant return no rows instead of an error.
ALTER TABLE doc_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_chunks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON doc_chunks;
CREATE POLICY tenant_isolation ON doc_chunks
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
