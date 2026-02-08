-- Lock scans should be server-controlled only
-- Safe to run multiple times

ALTER TABLE IF EXISTS public.scan_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scan_locks_insert_server_only ON public.scan_locks;
CREATE POLICY scan_locks_insert_server_only ON public.scan_locks
  FOR INSERT
  WITH CHECK (1 = 0);

DROP POLICY IF EXISTS scan_locks_select_server_only ON public.scan_locks;
CREATE POLICY scan_locks_select_server_only ON public.scan_locks
  FOR SELECT
  USING (1 = 0);
