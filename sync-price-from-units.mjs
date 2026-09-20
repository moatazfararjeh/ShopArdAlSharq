// One-time backfill: copies each product's unit price into its main "price"
// field, so existing data matches the new rule (main price always mirrors a
// unit price — see add.tsx / edit.tsx / report.tsx).
//
// Priority when a product has more than one unit price set: carton > kg > piece.
// Products with no unit price set at all are left untouched.
//
// Usage:
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=your-password node sync-price-from-units.mjs
//     → dry run: prints what WOULD change, writes nothing.
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... node sync-price-from-units.mjs --apply
//     → actually updates the "price" column for every mismatched product.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabasemobile.ardalsharq.com';
const SUPABASE_ANON_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MzI2OTI4MCwiZXhwIjo0OTI4OTQyODgwLCJyb2xlIjoiYW5vbiJ9.veK9gm5UJT-0cLAIyzY_-AEhclyOwMzQXrWkNDbWUxA';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const APPLY = process.argv.includes('--apply');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fetchAllProducts() {
  const pageSize = 1000;
  let from = 0;
  const all = [];
  for (;;) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name_ar, name_en, price, price_per_piece, price_per_kg, price_per_carton, is_available')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function unitSourcePrice(p) {
  if (p.price_per_carton != null) return p.price_per_carton;
  if (p.price_per_kg != null) return p.price_per_kg;
  if (p.price_per_piece != null) return p.price_per_piece;
  return null;
}

function differs(a, b) {
  // Compare to 3 decimal places (JOD fils) to avoid float noise.
  return Math.round(Number(a) * 1000) !== Math.round(Number(b) * 1000);
}

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Missing admin credentials.');
    console.error('Run with: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=your-password node sync-price-from-units.mjs [--apply]');
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

  const toUpdate = products
    .map((p) => ({ p, source: unitSourcePrice(p) }))
    .filter(({ source }) => source != null)
    .filter(({ p, source }) => differs(p.price, source));

  if (toUpdate.length === 0) {
    console.log('✓ لا يوجد منتج يحتاج تحديث — كل الأسعار الرئيسية مطابقة لسعر الوحدة.');
    return;
  }

  console.log(`${APPLY ? 'سيتم تحديث' : '[تجربة بدون حفظ] سيتم تحديث'} ${toUpdate.length} منتج:\n`);
  console.log('─'.repeat(90));
  console.log('اسم المنتج'.padEnd(42) + 'السعر الحالي'.padEnd(16) + 'السعر الجديد (من الوحدة)');
  console.log('─'.repeat(90));
  for (const { p, source } of toUpdate) {
    const name = (p.name_ar ?? p.name_en ?? p.id).toString();
    console.log(
      name.slice(0, 40).padEnd(42) +
      Number(p.price).toFixed(3).padEnd(16) +
      Number(source).toFixed(3),
    );
  }
  console.log('─'.repeat(90));

  if (!APPLY) {
    console.log('\nهذه تجربة بدون حفظ. لتطبيق التحديث فعلياً شغّل نفس الأمر وأضف --apply');
    return;
  }

  console.log('\nجاري الحفظ...');
  let ok = 0, failed = 0;
  for (const { p, source } of toUpdate) {
    const { error } = await supabase.from('products').update({ price: source }).eq('id', p.id);
    if (error) {
      console.error(`✗ ${p.name_ar}: ${error.message}`);
      failed++;
    } else {
      console.log(`✓ ${p.name_ar}: ${Number(p.price).toFixed(3)} → ${Number(source).toFixed(3)}`);
      ok++;
    }
  }
  console.log(`\nتم: ${ok} تم تحديثها، ${failed} فشلت.`);
}

main().catch((e) => {
  console.error('خطأ غير متوقع:', e.message);
  process.exit(1);
});
