CREATE OR REPLACE FUNCTION public.rag_source_counts()
RETURNS TABLE (source text, count bigint)
LANGUAGE sql STABLE
AS $$
  SELECT source, count(*)::bigint FROM public.rag_documents GROUP BY source ORDER BY source;
$$;

GRANT EXECUTE ON FUNCTION public.rag_source_counts() TO service_role, authenticated, anon;
