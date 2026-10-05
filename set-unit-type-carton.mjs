// One-time update: sets unit_type = 'carton' (الوحدة الرئيسية كرتون) on every product
// that isn't already carton.
//
// Usage:
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=your-password node set-unit-type-carton.mjs
//     → dry run: prints what WOULD change, writes nothing.
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... node set-unit-type-carton.mjs --apply
//     → actually updates unit_type for those products.
//
// Needs an admin login: RLS only lets the public key see available products, and
// writes require an admin account.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabasemobile.ardalsharq.com';
const SUPABASE_ANON_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MzI2OTI4MCwiZXhwIjo0OTI4OTQyODgwLCJyb2xlIjoiYW5vbiJ9.veK9gm5UJT-0cLAIyzY_-AEhclyOwMzQXrWkNDbWUxA';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const APPLY = process.argv.includes('--apply');
const CHUNK = 200;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fetchAllProducts() {
  const pageSize = 1000;
  let from = 0;
  const all = [];
  for (;;) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name_ar, name_en, unit_type, price_per_carton, pieces_per_carton')
      .order('id')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Missing admin credentials.');
    console.error('Run with: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=your-password node set-unit-type-carton.mjs [--apply]');
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

  const toUpdate = products.filter((p) => p.unit_type !== 'carton');
  if (toUpdate.length === 0) {
    console.log('✓ كل المنتجات نوع وحدتها كرتون بالفعل.');
    return;
  }

  const byType = {};
  for (const p of toUpdate) {
    const key = p.unit_type ?? 'بدون نوع';
    byType[key] = (byType[key] ?? 0) + 1;
  }
  console.log(`${APPLY ? 'سيتم تحديث' : '[تجربة بدون حفظ] سيتم تحديث'} ${toUpdate.length} منتج إلى "كرتون":`);
  for (const [type, count] of Object.entries(byType)) console.log(`  من ${type}: ${count}`);

  const noCartonPrice = toUpdate.filter((p) => p.price_per_carton == null);
  const noPiecesPerCarton = toUpdate.filter((p) => p.pieces_per_carton == null);
  console.log(`\nتنبيه: ${noCartonPrice.length} منتج ما عنده سعر كرتون، و${noPiecesPerCarton.length} منتج ما عنده عدد الحبات في الكرتون.`);

  if (!APPLY) {
    console.log('\nهذه تجربة بدون حفظ. لتطبيق التحديث فعلياً شغّل نفس الأمر وأضف --apply');
    return;
  }

  console.log('\nجاري الحفظ...');
  let updated = 0, failed = 0;
  for (let i = 0; i < toUpdate.length; i += CHUNK) {
    const ids = toUpdate.slice(i, i + CHUNK).map((p) => p.id);
    const { data, error } = await supabase
      .from('products')
      .update({ unit_type: 'carton' })
      .in('id', ids)
      .select('id');
    if (error) {
      console.error(`✗ دفعة ${i / CHUNK + 1}: ${error.message}`);
      failed += ids.length;
    } else {
      updated += data?.length ?? 0;
    }
  }
  console.log(`\nتم: ${updated} تم تحديثها، ${failed} فشلت.`);
}

main().catch((e) => {
  console.error('خطأ غير متوقع:', e.message);
  process.exit(1);
});
