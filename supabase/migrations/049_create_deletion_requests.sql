-- Tracks the table the account-deletion page (web and in-app) writes to.
-- It was never in a migration before this, so it may already exist from a
-- manual create in the SQL editor — IF NOT EXISTS makes this safe either way.
CREATE TABLE IF NOT EXISTS deletion_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email      TEXT NOT NULL,
  reason     TEXT,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

-- The deletion page must work for people who aren't logged in (Google Play
-- requires the deletion link to work without an account/session), so anyone
-- holding the public anon key can insert a request.
DROP POLICY IF EXISTS "Anyone can submit a deletion request" ON deletion_requests;
CREATE POLICY "Anyone can submit a deletion request" ON deletion_requests
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage deletion requests" ON deletion_requests;
CREATE POLICY "Admins can manage deletion requests" ON deletion_requests
  FOR ALL USING (is_admin());
