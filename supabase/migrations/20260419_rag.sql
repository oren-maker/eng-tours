-- Self-healing RAG knowledge base (2026-04-19)
-- Uses pgvector (Supabase default extension) for similarity search.
-- Embeddings from Gemini text-embedding-004 (768 dims).
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.rag_documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source      text NOT NULL,           -- 'faq' | 'event' | 'legal' | 'hotel' | 'flight' | 'ticket' | 'package' | 'supplier'
  source_id   text,                    -- id of the originating row (text to accept any type)
  title       text,                    -- short label for UI
  content     text NOT NULL,           -- chunk body (already chunked)
  chunk_index int NOT NULL DEFAULT 0,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding   vector(768),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_id, chunk_index)
);

-- HNSW index for fast cosine similarity on 768-dim vectors
CREATE INDEX IF NOT EXISTS idx_rag_docs_embedding
  ON public.rag_documents
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_rag_docs_source ON public.rag_documents (source);
CREATE INDEX IF NOT EXISTS idx_rag_docs_updated ON public.rag_documents (updated_at DESC);

-- Q&A history (for analytics + repeated-question cache)
CREATE TABLE IF NOT EXISTS public.rag_queries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  question        text NOT NULL,
  rewritten       text,
  answer          text,
  grade           text,            -- 'pass' | 'fail' | 'give_up'
  retrieved_ids   uuid[],
  retry_count     int NOT NULL DEFAULT 0,
  elapsed_ms      int,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rag_queries_created ON public.rag_queries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rag_queries_user ON public.rag_queries (user_id);

ALTER TABLE public.rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_queries ENABLE ROW LEVEL SECURITY;
