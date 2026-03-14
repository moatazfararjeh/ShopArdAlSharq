-- 021_add_product_unit_prices.sql
-- Adds per-unit prices to products and selected_unit to cart_items

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS price_per_piece  NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS price_per_carton NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS pieces_per_carton INTEGER;

ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS selected_unit TEXT
  CHECK (selected_unit IN ('piece', 'carton'));
