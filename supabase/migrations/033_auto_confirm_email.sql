-- 033_auto_confirm_email.sql
-- Auto-confirm every new user's email so no verification email is needed.
-- This is an intentional product decision: users are vetted via commercial
-- register upload at sign-up time, so email ownership is not the gate.

CREATE OR REPLACE FUNCTION public.auto_confirm_user_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at         = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_confirm_user_email() TO service_role;

DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_auto_confirm
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_user_email();
