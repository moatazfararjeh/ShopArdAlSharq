-- ════════════════════════════════════════════════════════════════════════════
-- Add flash sale fields to products:
--   flash_sale_price  — the discounted price during the sale
--   flash_sale_ends_at — when the sale expires (NULL = no active sale)
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE products
  ADD COLUMN flash_sale_price   NUMERIC(10,2) CHECK (flash_sale_price > 0),
  ADD COLUMN flash_sale_ends_at TIMESTAMPTZ;

-- Index to efficiently query currently-active flash sales
CREATE INDEX idx_products_flash_sale_ends_at
  ON products(flash_sale_ends_at)
  WHERE flash_sale_ends_at IS NOT NULL;
