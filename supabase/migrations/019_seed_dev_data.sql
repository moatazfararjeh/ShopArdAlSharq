-- 019_seed_dev_data.sql
-- Seed data for local development only — do NOT run in production

INSERT INTO categories (name_ar, name_en, sort_order, is_active) VALUES
  ('تمور وحلويات', 'Dates & Sweets', 1, TRUE),
  ('عسل طبيعي', 'Natural Honey', 2, TRUE),
  ('قهوة عربية', 'Arabic Coffee', 3, TRUE),
  ('توابل وبهارات', 'Spices & Herbs', 4, TRUE),
  ('منتجات ألبان', 'Dairy Products', 5, TRUE)
ON CONFLICT DO NOTHING;
