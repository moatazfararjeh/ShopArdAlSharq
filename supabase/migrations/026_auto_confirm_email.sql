-- 026_auto_confirm_email.sql
-- Auto-confirm email for every new user so no email verification is required
CREATE OR REPLACE FUNCTION auto_confirm_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE id = NEW.id AND email_confirmed_at IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users;

CREATE TRIGGER on_auth_user_created_confirm
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auto_confirm_user();
