-- Remove public read access on subscribers
-- Safe to run multiple times

ALTER TABLE IF EXISTS public.subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_read_subscribers ON public.subscribers;
DROP POLICY IF EXISTS subscribers_select_public ON public.subscribers;
