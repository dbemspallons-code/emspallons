-- Supabase initial migration: tables, indexes, triggers and example policies
-- Run via Supabase SQL editor or using the supplied scripts (scripts/apply-supabase-init.sh / .ps1)

-- ====== Tables ======
-- Subscribers
CREATE TABLE IF NOT EXISTS subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricule varchar(64) UNIQUE,
  name varchar(255) NOT NULL,
  email varchar(255),
  phone varchar(32),
  class varchar(64),
  status varchar(50) DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid REFERENCES subscribers(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  period_date date NOT NULL,
  method varchar(64),
  created_at timestamptz DEFAULT now()
);

-- QR Codes
CREATE TABLE IF NOT EXISTS qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid REFERENCES subscribers(id) ON DELETE CASCADE,
  token varchar(255) UNIQUE NOT NULL,
  status varchar(50) DEFAULT 'active',
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Scan logs
CREATE TABLE IF NOT EXISTS scan_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid,
  status varchar(50),
  payment_status varchar(50),
  controller_id uuid,
  controller_name varchar(255),
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Educator activities (audit trail)
CREATE TABLE IF NOT EXISTS educator_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id uuid,
  action varchar(255) NOT NULL,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

-- Scan locks (prevent duplicate scans)
CREATE TABLE IF NOT EXISTS scan_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token varchar(255) NOT NULL,
  line varchar(64) NOT NULL,
  locked_at timestamptz DEFAULT now()
);

-- Controllers (drivers / controllers who scan)
CREATE TABLE IF NOT EXISTS controllers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  code varchar(64) UNIQUE NOT NULL,
  password varchar(255) NOT NULL,
  active boolean DEFAULT true,
  assigned_line_id uuid,
  connexions jsonb DEFAULT '[]'::jsonb,
  derniere_connexion timestamptz,
  last_login timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_controllers_code ON controllers(code);
-- School photos (media stored in Supabase Storage, metadata in table)
CREATE TABLE IF NOT EXISTS school_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name varchar(255),
  storage_path text,
  url text,
  created_at timestamptz DEFAULT now()
);

-- Promotions & Classes
CREATE TABLE IF NOT EXISTS promos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  order_num int DEFAULT 0,
  active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  promo_id uuid REFERENCES promos(id) ON DELETE SET NULL,
  active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promos_order ON promos(order_num);
CREATE INDEX IF NOT EXISTS idx_classes_name ON classes(name);
CREATE INDEX IF NOT EXISTS idx_school_photos_created_at ON school_photos(created_at);

-- Enable RLS on school_photos and provide example policies
ALTER TABLE IF EXISTS school_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS school_photos_select_auth ON school_photos;
CREATE POLICY school_photos_select_auth ON school_photos
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS school_photos_insert_server_only ON school_photos;
CREATE POLICY school_photos_insert_server_only ON school_photos
  FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS school_photos_delete_server_only ON school_photos;
CREATE POLICY school_photos_delete_server_only ON school_photos
  FOR DELETE
  USING (false);

-- ====== Indexes ======
CREATE INDEX IF NOT EXISTS idx_subscribers_matricule ON subscribers(matricule);
CREATE INDEX IF NOT EXISTS idx_qr_token ON qr_codes(token);
CREATE INDEX IF NOT EXISTS idx_scanlocks_token_line ON scan_locks(token, line);

-- ====== Timestamp trigger ======
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_subscribers') THEN
    CREATE TRIGGER set_timestamp_subscribers
    BEFORE UPDATE ON subscribers
    FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
  END IF;
END$$;

-- ====== Enable RLS (Row-Level Security) ======
ALTER TABLE IF EXISTS subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scan_logs ENABLE ROW LEVEL SECURITY;

-- ====== Example Policies (adjust to your auth roles) ======
-- PUBLIC READ subscribers (only if acceptable for your use case)
DROP POLICY IF EXISTS public_read_subscribers ON subscribers;
CREATE POLICY public_read_subscribers ON subscribers
  FOR SELECT
  USING (true);

-- Restrict payments INSERT to authenticated users (modify as appropriate)
DROP POLICY IF EXISTS payments_insert_auth ON payments;
CREATE POLICY payments_insert_auth ON payments
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Prevent client-side inserts into qr_codes (server-only)
DROP POLICY IF EXISTS qr_insert_server_only ON qr_codes;
CREATE POLICY qr_insert_server_only ON qr_codes
  FOR INSERT
  WITH CHECK (false);

-- Allow read of qr_codes for verification (tweak as needed)
DROP POLICY IF EXISTS qr_select_public ON qr_codes;
CREATE POLICY qr_select_public ON qr_codes
  FOR SELECT
  USING (true);

-- Allow scan_logs INSERT only by authenticated controllers and ensure controller_id matches auth.uid()
DROP POLICY IF EXISTS scan_logs_insert_by_controller ON scan_logs;
CREATE POLICY scan_logs_insert_by_controller ON scan_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND controller_id = auth.uid());

-- Educator activities: server-only inserts (audit should come from server functions)
DROP POLICY IF EXISTS educator_activities_insert_server_only ON educator_activities;
CREATE POLICY educator_activities_insert_server_only ON educator_activities
  FOR INSERT
  WITH CHECK (false);

-- Subscription history (resubscriptions)
CREATE TABLE IF NOT EXISTS subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid,
  start_date timestamptz,
  expires_at timestamptz,
  duration_months int,
  amount_paid numeric(10,2),
  payment_method varchar(128),
  bus_line varchar(128),
  previous_subscription_id uuid,
  created_by uuid,
  created_by_name varchar(255),
  created_by_email varchar(255),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_history_student ON subscription_history(student_id);

-- Reminders config & logs
CREATE TABLE IF NOT EXISTS reminders_config (
  id varchar(64) PRIMARY KEY,
  config jsonb,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS reminders_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid,
  student_name varchar(255),
  student_contact varchar(64),
  reminder_type varchar(64),
  channel varchar(64),
  message text,
  status varchar(32) DEFAULT 'pending',
  send_result text,
  error text,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminders_log_student ON reminders_log(student_id);

-- System history (general events)
CREATE TABLE IF NOT EXISTS system_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_name varchar(255),
  type varchar(128),
  entity_id uuid,
  entity_type varchar(128),
  action varchar(255),
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_history_created_at ON system_history(created_at);

-- Enable RLS on the new tables
ALTER TABLE IF EXISTS subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reminders_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reminders_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_history ENABLE ROW LEVEL SECURITY;

-- Example policies for new tables
DROP POLICY IF EXISTS subscription_history_insert_server_only ON subscription_history;
CREATE POLICY subscription_history_insert_server_only ON subscription_history
  FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS reminders_config_manage_admin ON reminders_config;
CREATE POLICY reminders_config_manage_admin ON reminders_config
  FOR ALL
  USING (auth.role() = 'authenticated' AND auth.role() = 'admin')
  WITH CHECK (auth.role() = 'authenticated' AND auth.role() = 'admin');

DROP POLICY IF EXISTS reminders_log_insert_server_or_authenticated ON reminders_log;
CREATE POLICY reminders_log_insert_server_or_authenticated ON reminders_log
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS system_history_insert_server_only ON system_history;
CREATE POLICY system_history_insert_server_only ON system_history
  FOR INSERT
  WITH CHECK (false);

-- ====== Notes ======
-- 1) Adjust policies according to your auth design (roles, claims). Use Supabase SQL editor to test.
-- 2) To run policies tests, impersonate JWT with the desired role and try INSERT/SELECT.
-- 3) For server-side operations use the service_role key (SUPABASE_SERVICE_KEY) inside Netlify functions.

-- End of migration
