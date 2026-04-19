-- Password rotation tracking (2026-04-19)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;
-- Seed existing users: assume they changed "now" so we don't nag immediately
UPDATE public.users SET password_changed_at = COALESCE(password_changed_at, last_login_at, created_at, now())
WHERE password_changed_at IS NULL;
