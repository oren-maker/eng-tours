-- PII encryption at rest (2026-04-19)
-- App-side AES-256-GCM. Key lives in env (PII_ENCRYPTION_KEY), never in DB.
-- Ciphertext is base64-encoded text (IV|tag|ct) so it travels nicely through
-- the Supabase JS client and PostgREST without bytea conversion headaches.
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS passport_number_enc text;
