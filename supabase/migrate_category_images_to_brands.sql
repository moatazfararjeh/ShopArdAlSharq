-- Migrate category images to brands where name_ar matches brand name
-- Run this AFTER 035_add_brand_image.sql

UPDATE brands b
SET image_url = c.image_url
FROM categories c
WHERE c.name_ar = b.name
  AND c.image_url IS NOT NULL
  AND (b.image_url IS NULL OR b.image_url = '');
