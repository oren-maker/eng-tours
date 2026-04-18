-- Missing indexes audit (2026-04-18)
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users (phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_log_order_created ON public.whatsapp_log (order_id, created_at DESC);
DROP INDEX IF EXISTS public.idx_whatsapp_log_order;
