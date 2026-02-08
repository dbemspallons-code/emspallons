-- Create educators table and RLS policies
-- Safe to run multiple times

CREATE TABLE IF NOT EXISTS public.educators (
  id uuid PRIMARY KEY,
  email text UNIQUE,
  name text,
  role text DEFAULT 'educateur',
  active boolean DEFAULT true,
  must_change_password boolean DEFAULT false,
  created_by uuid,
  first_login_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- If table already existed, ensure missing columns are added
ALTER TABLE IF EXISTS public.educators
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'educateur',
  ADD COLUMN IF NOT EXISTS active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS first_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_educators_email ON public.educators(email);
CREATE INDEX IF NOT EXISTS idx_educators_role ON public.educators(role);

ALTER TABLE IF EXISTS public.educators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS educators_select_self_or_admin ON public.educators;
CREATE POLICY educators_select_self_or_admin ON public.educators
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      auth.uid() = id
      OR EXISTS (
        SELECT 1 FROM public.educators e
        WHERE e.id = auth.uid() AND e.role = 'admin'
      )
    )
  );

-- Bootstrap: allow SELECT only when the table is empty (first admin setup)
DROP POLICY IF EXISTS educators_select_bootstrap ON public.educators;
CREATE POLICY educators_select_bootstrap ON public.educators
  FOR SELECT
  USING (
    NOT EXISTS (SELECT 1 FROM public.educators)
  );

DROP POLICY IF EXISTS educators_update_self_or_admin ON public.educators;
CREATE POLICY educators_update_self_or_admin ON public.educators
  FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND (
      auth.uid() = id
      OR EXISTS (
        SELECT 1 FROM public.educators e
        WHERE e.id = auth.uid() AND e.role = 'admin'
      )
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      auth.uid() = id
      OR EXISTS (
        SELECT 1 FROM public.educators e
        WHERE e.id = auth.uid() AND e.role = 'admin'
      )
    )
  );

DROP POLICY IF EXISTS educators_insert_admin_only ON public.educators;
CREATE POLICY educators_insert_admin_only ON public.educators
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.educators e
      WHERE e.id = auth.uid() AND e.role = 'admin'
    )
  );
