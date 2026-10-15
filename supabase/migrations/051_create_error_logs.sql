-- Client-side error logging: both native global JS error handlers and the
-- app's ErrorBoundary only ever did console.error(), which nobody sees in
-- production. This table lets the app persist what actually went wrong
-- (e.g. the opaque "حدث خطأ غير متوقع" checkout failures) so it's visible
-- from Studio without needing the customer to report it.
CREATE TABLE error_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  message     TEXT NOT NULL,
  stack       TEXT,
  context     TEXT,
  platform    TEXT,
  app_version TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_context ON error_logs(context);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Errors can happen before login (e.g. during sign-in itself), so inserts
-- must be allowed for anon as well as authenticated users.
CREATE POLICY "Anyone can insert error logs"
  ON error_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read error logs"
  ON error_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admins can delete error logs"
  ON error_logs FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
