-- 020_add_unit_type.sql
-- Adds a unit_type column to products for بالحبة / بالكيلو / بالكرتون
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS unit_type TEXT
  CHECK (unit_type IN ('piece', 'kg', 'carton'));
