-- 053_address_location.sql
-- Map location for delivery addresses (picked on an OpenStreetMap map in the app).
--
-- Nullable on purpose: addresses saved before this change have no location, and
-- app versions without the map picker must still be able to place orders. The
-- app requires a location when adding/editing an address and asks for one at
-- checkout for older addresses.
--
-- place_order() copies the whole address row with to_jsonb(a.*), so the
-- coordinates reach orders.delivery_address with no function change.

ALTER TABLE addresses
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

ALTER TABLE addresses
  DROP CONSTRAINT IF EXISTS addresses_location_valid;

ALTER TABLE addresses
  ADD CONSTRAINT addresses_location_valid CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  );
