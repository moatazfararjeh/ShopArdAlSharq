-- 022_add_price_per_kg.sql
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS price_per_kg NUMERIC(10,3);
