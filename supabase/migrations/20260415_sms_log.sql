CREATE TABLE IF NOT EXISTS sms_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction TEXT NOT NULL DEFAULT 'outbound',
  recipient_number TEXT NOT NULL,
  recipient_type TEXT,
  sender TEXT,
  message_body TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent','failed')),
  error TEXT,
  campaign_id BIGINT,
  order_id UUID,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sms_log_order ON sms_log(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_log_recipient ON sms_log(recipient_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_log_created ON sms_log(created_at DESC);
