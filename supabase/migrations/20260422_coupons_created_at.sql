ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
