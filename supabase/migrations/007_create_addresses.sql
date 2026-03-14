-- 007_create_addresses.sql
CREATE TABLE addresses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label             TEXT NOT NULL,
  recipient_name    TEXT NOT NULL,
  phone             TEXT NOT NULL,
  city              TEXT NOT NULL,
  district          TEXT,
  street            TEXT,
  building_number   TEXT,
  floor_number      TEXT,
  apartment_number  TEXT,
  notes             TEXT,
  is_default        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);

-- Only one default per user
CREATE UNIQUE INDEX idx_addresses_default
  ON addresses(user_id)
  WHERE is_default = TRUE;

CREATE TRIGGER addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
