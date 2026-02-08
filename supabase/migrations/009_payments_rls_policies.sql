-- RLS policies for payments
-- Allow authenticated educators to read/write

ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_select_educators ON public.payments;
CREATE POLICY payments_select_educators ON public.payments
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.educators e
      WHERE e.id = auth.uid() AND e.active = true
    )
  );

DROP POLICY IF EXISTS payments_insert_educators ON public.payments;
CREATE POLICY payments_insert_educators ON public.payments
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.educators e
      WHERE e.id = auth.uid() AND e.active = true
    )
  );

DROP POLICY IF EXISTS payments_update_educators ON public.payments;
CREATE POLICY payments_update_educators ON public.payments
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

DROP POLICY IF EXISTS payments_delete_educators ON public.payments;
CREATE POLICY payments_delete_educators ON public.payments
  FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.educators e
      WHERE e.id = auth.uid() AND e.active = true
    )
  );
