-- Ensure Supabase schema matches application fields (students + payments)
-- Safe to run multiple times

-- Subscribers (students)
ALTER TABLE IF EXISTS public.subscribers
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS promo text,
  ADD COLUMN IF NOT EXISTS class text,
  ADD COLUMN IF NOT EXISTS bus_line text,
  ADD COLUMN IF NOT EXISTS pickup_point text,
  ADD COLUMN IF NOT EXISTS guardian text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Payments (subscriptions)
ALTER TABLE IF EXISTS public.payments
  ADD COLUMN IF NOT EXISTS total_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS number_of_months int,
  ADD COLUMN IF NOT EXISTS monthly_fee numeric(10,2),
  ADD COLUMN IF NOT EXISTS period_start timestamptz,
  ADD COLUMN IF NOT EXISTS period_end timestamptz,
  ADD COLUMN IF NOT EXISTS grace_end timestamptz,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS bus_line text;

-- Indexes for common filters
CREATE INDEX IF NOT EXISTS idx_subscribers_bus_line ON public.subscribers(bus_line);
CREATE INDEX IF NOT EXISTS idx_subscribers_promo ON public.subscribers(promo);
CREATE INDEX IF NOT EXISTS idx_subscribers_class ON public.subscribers(class);
CREATE INDEX IF NOT EXISTS idx_payments_subscriber_id ON public.payments(subscriber_id);

