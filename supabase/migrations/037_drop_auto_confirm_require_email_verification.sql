-- 037_drop_auto_confirm_require_email_verification.sql
-- Remove the auto-confirm email trigger so that new users must verify their
-- email address before they can sign in.
-- The Supabase project SMTP must be configured to use info@ardalsharq.com
-- as the sender so verification emails are delivered from that address.

-- Drop the trigger added in 033
DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
DROP FUNCTION IF EXISTS public.auto_confirm_user_email();
