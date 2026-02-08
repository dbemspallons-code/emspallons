-- Ensure auth.users creates/updates public.educators
-- Safe to run multiple times

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_name text;
  v_must_change boolean;
  v_created_by uuid;
BEGIN
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'educateur');
  v_name := COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  v_must_change := COALESCE((new.raw_user_meta_data->>'must_change_password')::boolean, v_role <> 'admin');
  v_created_by := NULLIF(new.raw_user_meta_data->>'created_by', '')::uuid;

  INSERT INTO public.educators (id, email, name, role, active, must_change_password, created_by, created_at, updated_at)
  VALUES (new.id, lower(new.email), v_name, v_role, true, v_must_change, v_created_by, now(), now())
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.educators.name),
        role = COALESCE(EXCLUDED.role, public.educators.role),
        active = COALESCE(EXCLUDED.active, public.educators.active),
        must_change_password = COALESCE(EXCLUDED.must_change_password, public.educators.must_change_password),
        created_by = COALESCE(EXCLUDED.created_by, public.educators.created_by),
        updated_at = now();

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();

-- Backfill existing auth users without educator profile
INSERT INTO public.educators (id, email, name, role, active, must_change_password, created_at, updated_at)
SELECT
  u.id,
  lower(u.email),
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'role', 'educateur'),
  true,
  COALESCE((u.raw_user_meta_data->>'must_change_password')::boolean, false),
  now(),
  now()
FROM auth.users u
LEFT JOIN public.educators e ON e.id = u.id
WHERE e.id IS NULL;
