-- RLS policies for subscribers (students)
-- Allow authenticated educators to insert/update/delete

ALTER TABLE IF EXISTS public.subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscribers_insert_educators ON public.subscribers;
CREATE POLICY subscribers_insert_educators ON public.subscribers
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.educators e
      WHERE e.id = auth.uid() AND e.active = true
    )
  );

DROP POLICY IF EXISTS subscribers_update_educators ON public.subscribers;
CREATE POLICY subscribers_update_educators ON public.subscribers
  FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.educators e
      WHERE e.id = auth.uid() AND e.active = true
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.educators e
      WHERE e.id = auth.uid() AND e.active = true
    )
  );

DROP POLICY IF EXISTS subscribers_delete_educators ON public.subscribers;
CREATE POLICY subscribers_delete_educators ON public.subscribers
  FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.educators e
      WHERE e.id = auth.uid() AND e.active = true
    )
  );

