-- 028_drop_auto_confirm_email.sql
-- SECURITY FIX: Remove the development-only auto-email-confirmation trigger.
-- Migration 026 added a trigger that automatically marks every new user's email
-- as confirmed, bypassing ownership verification entirely.  This must be removed
-- before any production deployment to prevent account squatting / impersonation.

DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users;
DROP FUNCTION IF EXISTS auto_confirm_user();
