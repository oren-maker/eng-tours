-- RAG retrieval RPC. Returns top-K chunks by cosine similarity to an input vector.
CREATE OR REPLACE FUNCTION public.rag_match_documents(
  query_embedding vector(768),
  match_count int DEFAULT 4
)
RETURNS TABLE (
  id uuid,
  source text,
  title text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    d.id,
    d.source,
    d.title,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.rag_documents d
  WHERE d.embedding IS NOT NULL
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.rag_match_documents(vector, int) TO service_role, authenticated, anon;
