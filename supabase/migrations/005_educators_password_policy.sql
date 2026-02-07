-- Add password policy flags for educators
-- Safe to run multiple times

ALTER TABLE IF EXISTS public.educators
  ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS first_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

