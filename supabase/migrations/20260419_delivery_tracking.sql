-- Delivery tracking columns for log tables (2026-04-19)
ALTER TABLE public.whatsapp_log ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE public.whatsapp_log ADD COLUMN IF NOT EXISTS read_at timestamptz;

ALTER TABLE public.sms_log ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE public.sms_log ADD COLUMN IF NOT EXISTS external_id text;

ALTER TABLE public.email_log ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE public.email_log ADD COLUMN IF NOT EXISTS opened_at timestamptz;
ALTER TABLE public.email_log ADD COLUMN IF NOT EXISTS bounced_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_whatsapp_log_external_id ON public.whatsapp_log (external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sms_log_external_id ON public.sms_log (external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_log_message_id ON public.email_log (message_id) WHERE message_id IS NOT NULL;
