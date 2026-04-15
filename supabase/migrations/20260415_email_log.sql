CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction TEXT NOT NULL DEFAULT 'outbound',
  recipient_email TEXT NOT NULL,
  recipient_type TEXT CHECK (recipient_type IN ('customer','supplier','admin','test','marketing')),
  template_name TEXT,
  subject TEXT,
  body_html TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent','failed')),
  error TEXT,
  message_id TEXT,
  order_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_log_order ON email_log(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_recipient ON email_log(recipient_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_created ON email_log(created_at DESC);

CREATE TABLE IF NOT EXISTS email_unsubscribe_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('unsubscribed','resubscribed')),
  reason TEXT,
  source TEXT,
  actor_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_unsub_log_email ON email_unsubscribe_log(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unsub_log_created ON email_unsubscribe_log(created_at DESC);
