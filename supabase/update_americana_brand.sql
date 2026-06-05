-- update_americana_brand.sql
-- تحديث المنتجات التي تنتمي لفئة "أمريكانا" لتعيين الماركة "أمريكانا"

-- 1) أولاً: إنشاء الماركة إذا لم تكن موجودة
INSERT INTO brands (name, is_active, sort_order)
VALUES ('أمريكانا', true, 0)
ON CONFLICT (name) DO NOTHING;

-- 2) تحديث المنتجات
UPDATE products
SET brand_id = (SELECT id FROM brands WHERE name = 'أمريكانا')
WHERE category_id = (SELECT id FROM categories WHERE name_ar = 'أمريكانا');
