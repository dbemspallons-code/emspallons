-- Supabase SQL: tables, constraints and RLS policies

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

-- Educator activities (audit trail)
CREATE TABLE IF NOT EXISTS educator_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id uuid,
  action varchar(255) NOT NULL,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

-- Scan logs (historique des scans)
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

-- Scan locks (prevent double-scan)
CREATE TABLE IF NOT EXISTS scan_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token varchar(255) NOT NULL,
  line varchar(64) NOT NULL,
  locked_at timestamptz DEFAULT now()
);

-- Enable RLS on sensitive tables
ALTER TABLE IF EXISTS subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS educator_activities ENABLE ROW LEVEL SECURITY;

-- Enable RLS for scan_logs and restrictive policies
ALTER TABLE IF EXISTS scan_logs ENABLE ROW LEVEL SECURITY;

-- Deny client-side inserts into qr_codes (server-only insert via service_role)
-- Service role key bypasses RLS so server functions can still insert
DROP POLICY IF EXISTS "qr_insert_server_only" ON qr_codes;
CREATE POLICY "qr_insert_server_only" ON qr_codes
  FOR INSERT
  WITH CHECK (false);

-- Allow only authenticated controllers to insert scan_logs, and enforce controller_id = auth.uid()
-- Adjust condition depending on your auth uid mapping (educator IDs must match auth.uid())
DROP POLICY IF EXISTS "scan_logs_insert_by_controller" ON scan_logs;
CREATE POLICY "scan_logs_insert_by_controller" ON scan_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND controller_id = auth.uid());

-- Example minimal policies (adjust to your auth implementation)
-- Allow anon key to SELECT on subscribers (read-only) - refine for prod
DROP POLICY IF EXISTS "anon_select_subscribers" ON subscribers;
CREATE POLICY "anon_select_subscribers" ON subscribers
  FOR SELECT
  USING (true);

-- Allow inserts for payments only when authenticated (placeholder)
DROP POLICY IF EXISTS "payments_insert_auth" ON payments;
CREATE POLICY "payments_insert_auth" ON payments
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- NOTE: The above policies are examples. In production, prefer:
--  - service role keys for server-side writes (Netlify functions should use SUPABASE_SERVICE_ROLE_KEY)
--  - strict checks (e.g., matching controller_id to auth.uid(), role claims, or a custom claim like 'is_controller')
--  - disable anon inserts/updates and only allow read where necessary
--  - test policies with `supabase` CLI or the SQL editor before applying to prod

-- Allow Netlify server (service key) full access by checking for jwt.claims or service role
-- NOTE: Configure service_role key usage server-side; do not expose to frontend

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscribers_matricule ON subscribers(matricule);
CREATE INDEX IF NOT EXISTS idx_qr_token ON qr_codes(token);
CREATE INDEX IF NOT EXISTS idx_scanlocks_token_line ON scan_locks(token, line);

-- Triggers: update updated_at on row change
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
