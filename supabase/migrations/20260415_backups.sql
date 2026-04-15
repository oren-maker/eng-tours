-- Backups metadata table. Actual backup payload lives in Storage bucket `backups` as JSON.
CREATE TABLE IF NOT EXISTS backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trigger TEXT NOT NULL CHECK (trigger IN ('auto', 'manual')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  size_bytes BIGINT,
  tables_count INT,
  rows_count INT,
  storage_path TEXT,
  error_msg TEXT,
  duration_ms INT
);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups (created_at DESC);
