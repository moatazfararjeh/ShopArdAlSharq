// Checks whether each product's base price (`price`, shown on cards/listings)
// matches its carton price (`price_per_carton`, charged when a customer buys
// by the carton). These are edited independently in the admin forms, so they
// can drift apart — this script finds where they have.
//
// Usage:
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=your-password node check-carton-price.mjs
//
// Needs an admin login (not just the public anon key) because RLS only lets
// anonymous reads see products where is_available = true; an admin account
// can see (and this report needs to check) every product.
//
// This script only reports mismatches — it does not change any prices.
// Fix flagged products via the admin products report page
// (/products/report), which already supports editing both "سعر المنتج"
// and "السعر بالكرتونة" inline.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabasemobile.ardalsharq.com';
const SUPABASE_ANON_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MzI2OTI4MCwiZXhwIjo0OTI4OTQyODgwLCJyb2xlIjoiYW5vbiJ9.veK9gm5UJT-0cLAIyzY_-AEhclyOwMzQXrWkNDbWUxA';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fetchAllProducts() {
  const pageSize = 1000;
  let from = 0;
  const all = [];
  for (;;) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name_ar, name_en, price, price_per_carton, is_available')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function isMismatch(price, pricePerCarton) {
  // Compare to 3 decimal places (JOD fils) to avoid float noise.
  return Math.round(Number(price) * 1000) !== Math.round(Number(pricePerCarton) * 1000);
}

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Missing admin credentials.');
    console.error('Run with: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=your-password node check-carton-price.mjs');
    process.exit(1);
  }

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (authError) {
    console.error('تسجيل الدخول فشل:', authError.message);
    process.exit(1);
  }

  console.log('جاري تحميل المنتجات...');
  const products = await fetchAllProducts();
  console.log(`تم تحميل ${products.length} منتج.\n`);

  const withCarton = products.filter((p) => p.price_per_carton != null);
  const mismatches = withCarton.filter((p) => isMismatch(p.price, p.price_per_carton));

  if (mismatches.length === 0) {
    console.log(`✓ كل المنتجات (${withCarton.length} فيها سعر كرتون) متطابقة بين سعر المنتج وسعر الكرتون.`);
    return;
  }

  console.log(`⚠ ${mismatches.length} من ${withCarton.length} منتج فيه فرق بين سعر المنتج وسعر الكرتون:\n`);
  console.log('─'.repeat(100));
  console.log(
    'اسم المنتج'.padEnd(42) +
    'متوفر'.padEnd(8) +
    'سعر المنتج'.padEnd(14) +
    'سعر الكرتون'.padEnd(14) +
    'الفرق',
  );
  console.log('─'.repeat(100));
  for (const p of mismatches) {
    const diff = (Number(p.price_per_carton) - Number(p.price)).toFixed(3);
    const name = (p.name_ar ?? p.name_en ?? p.id).toString();
    console.log(
      name.slice(0, 40).padEnd(42) +
      (p.is_available ? 'نعم' : 'لا').padEnd(8) +
      Number(p.price).toFixed(3).padEnd(14) +
      Number(p.price_per_carton).toFixed(3).padEnd(14) +
      diff,
    );
  }
  console.log('─'.repeat(100));
  console.log('\nهذه المنتجات تحتاج تصحيح يدوي عبر صفحة تقرير المنتجات (/products/report)،');
  console.log('حيث يمكن تعديل "سعر المنتج" أو "السعر بالكرتونة" مباشرة لحل الفرق.');
}

main().catch((e) => {
  console.error('خطأ غير متوقع:', e.message);
  process.exit(1);
});
