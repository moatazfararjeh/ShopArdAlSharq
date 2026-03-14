-- Seed sample products — run in Supabase SQL Editor after all_migrations.sql
-- Uses subqueries to look up category IDs by name so no UUID hardcoding needed

INSERT INTO products (category_id, name_ar, name_en, slug, description_ar, description_en, price, discount_price, stock_quantity, is_available, is_featured, weight, weight_unit)
VALUES

-- تمور وحلويات (Dates & Sweets)
(
  (SELECT id FROM categories WHERE name_en = 'Dates & Sweets' LIMIT 1),
  'تمر المجدول الفاخر', 'Premium Medjool Dates',
  'premium-medjool-dates',
  'تمر مجدول طازج من أجود المزارع السعودية، كبير الحجم وغني بالطعم',
  'Fresh premium Medjool dates from the finest Saudi farms, large size and rich in flavor',
  85.00, 75.00, 100, TRUE, TRUE, 1.0, 'kg'
),
(
  (SELECT id FROM categories WHERE name_en = 'Dates & Sweets' LIMIT 1),
  'تمر السكري', 'Sukari Dates',
  'sukari-dates',
  'تمر السكري الأصفر اللذيذ من منطقة القصيم، حلاوة طبيعية مميزة',
  'Delicious golden Sukari dates from Al-Qassim region, distinctively sweet natural flavor',
  55.00, NULL, 150, TRUE, FALSE, 1.0, 'kg'
),
(
  (SELECT id FROM categories WHERE name_en = 'Dates & Sweets' LIMIT 1),
  'تمر الخلاص', 'Khalas Dates',
  'khalas-dates',
  'تمر الخلاص الفاخر من الأحساء، يتميز بطعمه الكراميلي الرائع',
  'Premium Khalas dates from Al-Ahsa, known for their wonderful caramel-like taste',
  65.00, 58.00, 80, TRUE, TRUE, 1.0, 'kg'
),

-- عسل طبيعي (Natural Honey)
(
  (SELECT id FROM categories WHERE name_en = 'Natural Honey' LIMIT 1),
  'عسل السدر اليمني الأصيل', 'Authentic Yemeni Sidr Honey',
  'yemeni-sidr-honey',
  'عسل السدر اليمني الخام 100% طبيعي، معروف بفوائده الصحية العديدة وطعمه المميز',
  '100% raw natural Yemeni Sidr honey, known for its numerous health benefits and distinctive taste',
  320.00, NULL, 40, TRUE, TRUE, 0.5, 'kg'
),
(
  (SELECT id FROM categories WHERE name_en = 'Natural Honey' LIMIT 1),
  'عسل الطلح الجبلي', 'Mountain Talh Honey',
  'mountain-talh-honey',
  'عسل الطلح الجبلي النقي من المناطق الجبلية السعودية، طعم خفيف وفوائد صحية',
  'Pure mountain Talh honey from Saudi highland regions, light taste and health benefits',
  180.00, 160.00, 60, TRUE, FALSE, 0.5, 'kg'
),

-- قهوة عربية (Arabic Coffee)
(
  (SELECT id FROM categories WHERE name_en = 'Arabic Coffee' LIMIT 1),
  'قهوة عربية فاخرة محمصة', 'Premium Roasted Arabic Coffee',
  'premium-arabic-coffee',
  'قهوة عربية طازجة محمصة بالطريقة التقليدية مع الهيل، أصيلة المذاق',
  'Freshly roasted Arabic coffee in the traditional way with cardamom, authentic flavor',
  45.00, NULL, 200, TRUE, TRUE, 0.5, 'kg'
),
(
  (SELECT id FROM categories WHERE name_en = 'Arabic Coffee' LIMIT 1),
  'قهوة خضراء غير محمصة', 'Green Unroasted Coffee',
  'green-unroasted-coffee',
  'حبوب القهوة الخضراء غير المحمصة للتحميص المنزلي، طازجة ومختارة بعناية',
  'Green unroasted coffee beans for home roasting, fresh and carefully selected',
  38.00, 32.00, 120, TRUE, FALSE, 0.5, 'kg'
),

-- توابل وبهارات (Spices & Herbs)
(
  (SELECT id FROM categories WHERE name_en = 'Spices & Herbs' LIMIT 1),
  'خلطة البهارات السعودية', 'Saudi Spice Blend',
  'saudi-spice-blend',
  'خلطة بهارات سعودية أصيلة من أجود التوابل، مثالية للكبسة والمندي',
  'Authentic Saudi spice blend from the finest spices, perfect for Kabsa and Mandi',
  28.00, NULL, 300, TRUE, TRUE, 0.25, 'kg'
),
(
  (SELECT id FROM categories WHERE name_en = 'Spices & Herbs' LIMIT 1),
  'زعفران إيراني أصل', 'Original Iranian Saffron',
  'iranian-saffron',
  'زعفران إيراني فاخر 100% خيوط كاملة، يضيف لوناً ونكهة مميزة للأطباق',
  '100% premium Iranian saffron, full threads, adds distinctive color and flavor to dishes',
  95.00, 85.00, 50, TRUE, TRUE, 0.005, 'kg'
),
(
  (SELECT id FROM categories WHERE name_en = 'Spices & Herbs' LIMIT 1),
  'هيل حبوب طازج', 'Fresh Cardamom Pods',
  'fresh-cardamom-pods',
  'حبوب الهيل الطازجة الخضراء عالية الجودة، رائحتها نفاذة ومميزة',
  'High quality fresh green cardamom pods with a pungent and distinctive aroma',
  42.00, 38.00, 80, TRUE, FALSE, 0.25, 'kg'
),

-- منتجات ألبان (Dairy Products)
(
  (SELECT id FROM categories WHERE name_en = 'Dairy Products' LIMIT 1),
  'جبنة قريش طازجة', 'Fresh Quraish Cheese',
  'fresh-quraish-cheese',
  'جبنة القريش الطازجة منزلية الصنع، غنية بالبروتين وخفيفة الدسم',
  'Fresh homemade-style Quraish cheese, rich in protein and low in fat',
  22.00, NULL, 90, TRUE, FALSE, 0.5, 'kg'
),
(
  (SELECT id FROM categories WHERE name_en = 'Dairy Products' LIMIT 1),
  'سمن بلدي أصلي', 'Authentic Local Ghee',
  'authentic-local-ghee',
  'سمن بلدي أصلي من حليب الأبقار الطازج، مصنوع بالطريقة التقليدية',
  'Authentic local ghee from fresh cow milk, made the traditional way',
  120.00, 105.00, 45, TRUE, TRUE, 0.5, 'kg'
)

ON CONFLICT (slug) DO NOTHING;
