-- 029_fix_profile_update_policy.sql
-- SECURITY FIX: Privilege escalation — the original "Users can update their own profile"
-- policy had no WITH CHECK clause, allowing any authenticated user to set
-- profiles.role = 'admin' on their own row, gaining full admin RLS access.
-- This replacement policy locks the role column to its current value on every UPDATE.

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent self-promotion: role must remain unchanged
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );
