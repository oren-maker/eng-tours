-- Outbound message queue (2026-04-19)
-- Persistent replacement for inline retry. Works alongside the existing
-- synchronous send paths — use this for batch / low-priority sends.
CREATE TABLE IF NOT EXISTS public.outbound_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email')),
  template_name text,
  recipient text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempt_count int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  last_error text,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  order_id uuid,
  recipient_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbound_queue_pending ON public.outbound_queue (status, scheduled_for) WHERE status IN ('pending', 'sending');
CREATE INDEX IF NOT EXISTS idx_outbound_queue_order ON public.outbound_queue (order_id, created_at DESC) WHERE order_id IS NOT NULL;

ALTER TABLE public.outbound_queue ENABLE ROW LEVEL SECURITY;
