-- RLS policies for system_history (client insert + admin read)
-- Safe to run multiple times

ALTER TABLE IF EXISTS public.system_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS system_history_insert_authenticated ON public.system_history;
CREATE POLICY system_history_insert_authenticated ON public.system_history
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS system_history_select_admin ON public.system_history;
CREATE POLICY system_history_select_admin ON public.system_history
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.educators e
      WHERE e.id = auth.uid() AND e.role = 'admin'
    )
  );
