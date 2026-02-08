-- Fix RLS recursion on educators by using security definer helpers
-- Safe to run multiple times

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.educators e
    WHERE e.id = auth.uid() AND e.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_bootstrap()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.educators);
$$;

ALTER TABLE IF EXISTS public.educators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS educators_select_self_or_admin ON public.educators;
CREATE POLICY educators_select_self_or_admin ON public.educators
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (auth.uid() = id OR public.is_admin())
  );

DROP POLICY IF EXISTS educators_select_bootstrap ON public.educators;
CREATE POLICY educators_select_bootstrap ON public.educators
  FOR SELECT
  USING (public.is_bootstrap());

DROP POLICY IF EXISTS educators_update_self_or_admin ON public.educators;
CREATE POLICY educators_update_self_or_admin ON public.educators
  FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND (auth.uid() = id OR public.is_admin())
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (auth.uid() = id OR public.is_admin())
  );

DROP POLICY IF EXISTS educators_insert_admin_only ON public.educators;
CREATE POLICY educators_insert_admin_only ON public.educators
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );
