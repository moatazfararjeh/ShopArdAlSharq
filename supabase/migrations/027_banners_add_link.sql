-- 027_banners_add_link.sql
-- Add link_type and link_value columns to banners table
-- link_type: 'product' | 'category' | null
-- link_value: product_id or category_id
ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS link_type  TEXT CHECK (link_type IN ('product', 'category')) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS link_value TEXT DEFAULT NULL;
