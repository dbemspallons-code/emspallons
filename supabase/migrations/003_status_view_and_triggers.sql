-- Add off-months table, status view, and payment activity triggers

-- Off months (mois hors service)
CREATE TABLE IF NOT EXISTS public.off_months (
  month_start date PRIMARY KEY,
  label text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_off_months_active ON public.off_months(active);

-- View: student payment status (single source of truth)
CREATE OR REPLACE VIEW public.v_student_status AS
WITH last_payment AS (
  SELECT DISTINCT ON (subscriber_id)
    subscriber_id,
    period_start,
    period_end,
    grace_end,
    total_amount,
    number_of_months,
    created_at
  FROM public.payments
  WHERE subscriber_id IS NOT NULL
  ORDER BY subscriber_id, period_end DESC NULLS LAST, created_at DESC
)
SELECT
  s.id AS student_id,
  s.name,
  s.first_name,
  s.last_name,
  s.bus_line,
  lp.period_start,
  lp.period_end,
  lp.grace_end,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.off_months om
      WHERE om.active = true
        AND om.month_start = date_trunc('month', now())::date
    ) THEN 'out_of_service'
    WHEN lp.period_end IS NULL THEN 'expired'
    WHEN now() <= lp.period_end THEN 'up_to_date'
    WHEN lp.grace_end IS NOT NULL AND now() <= lp.grace_end THEN 'late'
    ELSE 'expired'
  END AS payment_status
FROM public.subscribers s
LEFT JOIN last_payment lp ON lp.subscriber_id = s.id;

-- Trigger: log payment changes into system_history
CREATE OR REPLACE FUNCTION public.log_payment_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid;
  payload jsonb;
BEGIN
  actor = auth.uid();

  IF (TG_OP = 'INSERT') THEN
    payload = jsonb_build_object(
      'payment_id', NEW.id,
      'subscriber_id', NEW.subscriber_id,
      'total_amount', NEW.total_amount,
      'period_start', NEW.period_start,
      'period_end', NEW.period_end,
      'created_at', NEW.created_at
    );
    INSERT INTO public.system_history (user_id, user_name, type, entity_id, entity_type, action, details)
    VALUES (actor, null, 'PAYMENT', NEW.id, 'payment', 'PAYMENT_CREATED', payload);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    payload = jsonb_build_object(
      'payment_id', NEW.id,
      'subscriber_id', NEW.subscriber_id,
      'total_amount', NEW.total_amount,
      'period_start', NEW.period_start,
      'period_end', NEW.period_end,
      'before', to_jsonb(OLD),
      'after', to_jsonb(NEW)
    );
    INSERT INTO public.system_history (user_id, user_name, type, entity_id, entity_type, action, details)
    VALUES (actor, null, 'PAYMENT', NEW.id, 'payment', 'PAYMENT_UPDATED', payload);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    payload = jsonb_build_object(
      'payment_id', OLD.id,
      'subscriber_id', OLD.subscriber_id,
      'total_amount', OLD.total_amount,
      'period_start', OLD.period_start,
      'period_end', OLD.period_end
    );
    INSERT INTO public.system_history (user_id, user_name, type, entity_id, entity_type, action, details)
    VALUES (actor, null, 'PAYMENT', OLD.id, 'payment', 'PAYMENT_DELETED', payload);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_payment_activity ON public.payments;
CREATE TRIGGER trg_log_payment_activity
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE PROCEDURE public.log_payment_activity();
