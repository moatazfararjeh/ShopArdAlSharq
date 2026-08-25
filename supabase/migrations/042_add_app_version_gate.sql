-- Force-update gate: a single config row the app checks on native launch.
-- Bump ios_min_version / android_min_version from Supabase (no new app build
-- needed) whenever an existing install must be forced to update.
CREATE TABLE IF NOT EXISTS app_version_config (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  ios_min_version TEXT NOT NULL DEFAULT '1.0.0',
  android_min_version TEXT NOT NULL DEFAULT '1.0.0',
  update_message_ar TEXT NOT NULL DEFAULT 'يتوفر إصدار جديد من التطبيق. يرجى التحديث للمتابعة.',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_version_config_singleton CHECK (id = 1)
);

INSERT INTO app_version_config (id, ios_min_version, android_min_version)
VALUES (1, '1.0.2', '1.0.2')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE app_version_config ENABLE ROW LEVEL SECURITY;

-- Must be readable before login (the gate runs before auth resolves).
DROP POLICY IF EXISTS "Public read app_version_config" ON app_version_config;
CREATE POLICY "Public read app_version_config"
  ON app_version_config FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins update app_version_config" ON app_version_config;
CREATE POLICY "Admins update app_version_config"
  ON app_version_config FOR UPDATE
  USING (is_admin());
