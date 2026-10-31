// Bulk product sheet: export every product to Excel, let the client fill in
// name / category / section / brand / price / quantity, then import it back
// with a preview before anything is written.
//
// Price rule: one price column per selling unit (piece / kg / carton / tin)
// plus which unit is the main one. A blank price = not sold in that unit.
// Importing saves the whole unit list (product_units); the database copies
// the main unit onto the product's summary price columns. Sheets exported
// before this had a single "السعر" column for the main unit — still accepted.

import { supabase } from '@/lib/supabase';
import { getProductUnits } from '@/types/models';
import type { Product, Category, Section, Brand, SaleUnit, ProductUnit } from '@/types/models';
import { saveProductUnits, type ProductUnitInput } from '@/services/productService';

export const COL = {
  id:       'رقم المنتج (لا تعدّل)',
  erp:      'كود ERP',
  name:     'اسم المنتج',
  category: 'الفئة',
  section:  'القسم',
  brand:    'الماركة',
  mainUnit: 'الوحدة الأساسية',
  piece:    'سعر الحبة (د.أ)',
  kg:       'سعر الكيلو (د.أ)',
  carton:   'سعر الكرتونة (د.أ)',
  cartonPieces: 'حبات الكرتونة',
  tin:      'سعر التنكة (د.أ)',
  qty:      'الكمية',
} as const;

/** The single price column of sheets exported before per-unit prices. */
const LEGACY_PRICE = 'السعر (د.أ)';

const UNIT_ORDER: SaleUnit[] = ['piece', 'kg', 'carton', 'tin'];
const UNIT_NAME: Record<SaleUnit, string> = { piece: 'حبة', kg: 'كيلو', carton: 'كرتونة', tin: 'تنكة' };

/** "كرتونة" / "كرتون" / "carton"… → unit; null when not recognised. */
function parseUnit(v: string): SaleUnit | null {
  const t = key(v).replace(/[ةه]$/, '');
  if (!t) return null;
  if (['حب', 'piece', 'pc'].includes(t)) return 'piece';
  if (['كيلو', 'كغ', 'kg'].includes(t)) return 'kg';
  if (['كرتون', 'carton'].includes(t)) return 'carton';
  if (['تنك', 'tin'].includes(t)) return 'tin';
  return null;
}

const fmt = (n: number) => n.toFixed(3);

/** Main unit + one price per unit (blank when not sold in it), for export. */
function unitColumns(p: Product) {
  const units = getProductUnits(p);
  const price = (u: SaleUnit) => units.find((x) => x.unit === u)?.price ?? '';
  return {
    [COL.mainUnit]: units[0] ? UNIT_NAME[units[0].unit] : '',
    [COL.piece]: price('piece'),
    [COL.kg]: price('kg'),
    [COL.carton]: price('carton'),
    [COL.cartonPieces]: units.find((x) => x.unit === 'carton')?.pieces_per_unit ?? '',
    [COL.tin]: price('tin'),
  };
}

const norm = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim();
const key = (s: unknown) => norm(s).toLowerCase();

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportProductsExcel(
  products: Product[],
  sections: Section[],
  categories: Category[],
  brands: Brand[],
) {
  const XLSX = await import('xlsx');
  const sectionName = new Map(sections.map((s) => [s.id, s.name_ar]));

  const rows = [...products]
    .sort((a, b) =>
      norm(a.categories?.name_ar).localeCompare(norm(b.categories?.name_ar), 'ar')
      || norm(a.name_ar).localeCompare(norm(b.name_ar), 'ar'))
    .map((p) => ({
      [COL.id]: p.id,
      [COL.erp]: p.erp_code ?? '',
      [COL.name]: norm(p.name_ar),
      [COL.category]: norm(p.categories?.name_ar),
      [COL.section]: p.section_id ? sectionName.get(p.section_id) ?? '' : '',
      [COL.brand]: norm(p.brands?.name),
      ...unitColumns(p),
      [COL.qty]: p.stock_quantity ?? 0,
    }));

  const ws = XLSX.utils.json_to_sheet(rows, { header: Object.values(COL) });
  ws['!cols'] = [
    { wch: 38 }, { wch: 12 }, { wch: 40 }, { wch: 22 }, { wch: 18 }, { wch: 18 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 13 }, { wch: 14 }, { wch: 10 },
  ];
  (ws as any)['!views'] = [{ RTL: true }];

  // Reference lists so the client types names that already exist
  const maxLen = Math.max(categories.length, sections.length, brands.length);
  const lists = Array.from({ length: maxLen }, (_, i) => ({
    'الفئات': categories[i]?.name_ar ?? '',
    'الأقسام': sections[i]?.name_ar ?? '',
    'الماركات': brands[i]?.name ?? '',
  }));
  const wsLists = XLSX.utils.json_to_sheet(lists);
  wsLists['!cols'] = [{ wch: 26 }, { wch: 22 }, { wch: 22 }];
  (wsLists as any)['!views'] = [{ RTL: true }];

  const notes = [
    ['تعليمات'],
    ['• عدّل الاسم أو الفئة أو القسم أو الماركة أو السعر أو الكمية فقط.'],
    ['• لا تغيّر عمود "رقم المنتج" — يُستخدم لمطابقة المنتج عند الرفع.'],
    ['• اكتب أسماء الفئات والأقسام والماركات كما هي في ورقة "القوائم".'],
    ['• القسم والماركة يمكن تركهما فارغين. الفئة مطلوبة.'],
    ['• الأسعار بالدينار لكل وحدة: الحبة، الكيلو، الكرتونة، التنكة. اترك السعر فارغاً إذا لا يُباع المنتج بهذه الوحدة.'],
    ['• "الوحدة الأساسية": حبة أو كيلو أو كرتونة أو تنكة — تظهر أولاً للزبون، ويجب أن يكون لها سعر.'],
    ['• "حبات الكرتونة": عدد الحبات داخل الكرتونة (اختياري).'],
    ['• مسح سعر وحدة موجودة يوقف بيع المنتج بهذه الوحدة. الخصومات الحالية تبقى ما دامت أقل من السعر الجديد.'],
    ['• الكمية رقم صحيح.'],
    ['• الصفوف الجديدة بدون رقم منتج لا تُضاف — أضف المنتجات الجديدة من التطبيق.'],
  ];
  const wsNotes = XLSX.utils.aoa_to_sheet(notes);
  wsNotes['!cols'] = [{ wch: 80 }];
  (wsNotes as any)['!views'] = [{ RTL: true }];

  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] } as any;
  XLSX.utils.book_append_sheet(wb, ws, 'المنتجات');
  XLSX.utils.book_append_sheet(wb, wsLists, 'القوائم');
  XLSX.utils.book_append_sheet(wb, wsNotes, 'تعليمات');
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `foodbox-products-${date}.xlsx`);
}

// ─── Import: parse ────────────────────────────────────────────────────────────

export interface SheetRow {
  rowNumber: number; // Excel row number, for messages
  id: string;
  name: string;
  category: string;
  section: string;
  brand: string;
  mainUnit: string;
  /** Per-unit prices; `undefined` = the sheet has no column for it (old sheet). */
  prices: Partial<Record<SaleUnit, unknown>>;
  cartonPieces: unknown;
  /** Old sheets: the main unit's price. */
  legacyPrice?: unknown;
  qty: unknown;
}

export async function parseProductsFile(buffer: ArrayBuffer): Promise<SheetRow[]> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets['المنتجات'] ?? wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (!raw.length || !(COL.id in raw[0]) || !(COL.name in raw[0])) {
    throw new Error('الملف لا يطابق قالب المنتجات. صدّر القالب من التطبيق واملأه ثم ارفعه.');
  }
  const perUnit = UNIT_ORDER.some((u) => COL[u] in raw[0]);
  if (!perUnit && !(LEGACY_PRICE in raw[0])) {
    throw new Error('الملف لا يحتوي أعمدة الأسعار. صدّر القالب من التطبيق واملأه ثم ارفعه.');
  }
  return raw.map((r, i) => ({
    rowNumber: i + 2,
    id: norm(r[COL.id]),
    name: norm(r[COL.name]),
    category: norm(r[COL.category]),
    section: norm(r[COL.section]),
    brand: norm(r[COL.brand]),
    mainUnit: norm(r[COL.mainUnit]),
    prices: perUnit
      ? Object.fromEntries(UNIT_ORDER.filter((u) => COL[u] in r).map((u) => [u, r[COL[u]]]))
      : {},
    cartonPieces: COL.cartonPieces in r ? r[COL.cartonPieces] : undefined,
    legacyPrice: perUnit ? undefined : r[LEGACY_PRICE],
    qty: r[COL.qty],
  }));
}

// ─── Import: plan ─────────────────────────────────────────────────────────────

export type RowStatus = 'ready' | 'unchanged' | 'error' | 'not_found' | 'new';

export interface PlanRow {
  status: RowStatus;
  rowNumber: number;
  productId: string | null;
  name: string;
  changes: string[];          // human-readable "السعر: 10.000 ← 11.000"
  reason: string | null;
  update: Record<string, unknown> | null;
  /** Full unit list to save when the default unit's price changed. */
  units?: ProductUnitInput[];
  /** Section / brand names that don't exist yet — created on apply, then linked */
  newSectionName?: string;
  newBrandName?: string;
}

function distinctNew(rows: PlanRow[], pick: (r: PlanRow) => string | undefined): string[] {
  const seen = new Map<string, string>();
  for (const r of rows) {
    const name = pick(r);
    if (r.status === 'ready' && name && !seen.has(key(name))) seen.set(key(name), name);
  }
  return [...seen.values()];
}

/** Distinct new section names the plan will create (in first-seen order). */
export const newSectionsInPlan = (rows: PlanRow[]) => distinctNew(rows, (r) => r.newSectionName);
/** Distinct new brand names the plan will create (in first-seen order). */
export const newBrandsInPlan = (rows: PlanRow[]) => distinctNew(rows, (r) => r.newBrandName);

function toNumber(v: unknown): number | null {
  if (v === '' || v == null) return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : NaN;
}

export function buildPlan(
  rows: SheetRow[],
  products: Product[],
  categories: Category[],
  sections: Section[],
  brands: Brand[],
): PlanRow[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const catByName = new Map(categories.map((c) => [key(c.name_ar), c]));
  const secByName = new Map(sections.map((s) => [key(s.name_ar), s]));
  const brandByName = new Map(brands.map((b) => [key(b.name), b]));
  const sectionName = new Map(sections.map((s) => [s.id, s.name_ar]));
  const seen = new Set<string>();

  return rows
    .filter((r) => r.id || r.name)           // skip fully empty lines
    .map((r): PlanRow => {
      const base = { rowNumber: r.rowNumber, productId: r.id || null, name: r.name, changes: [], update: null };
      if (!r.id) return { ...base, status: 'new', reason: 'منتج جديد بدون رقم — أضفه من التطبيق' };
      const p = byId.get(r.id);
      if (!p) return { ...base, status: 'not_found', reason: 'رقم المنتج غير موجود' };
      if (seen.has(r.id)) return { ...base, status: 'error', reason: 'المنتج مكرر في الملف' };
      seen.add(r.id);

      const errors: string[] = [];
      const update: Record<string, unknown> = {};
      const changes: string[] = [];

      // Name
      if (!r.name) errors.push('الاسم فارغ');
      else if (r.name !== norm(p.name_ar)) {
        update.name_ar = r.name;
        changes.push(`الاسم: ${norm(p.name_ar)} ← ${r.name}`);
      }

      // Category (required)
      const cat = catByName.get(key(r.category));
      if (!r.category) errors.push('الفئة فارغة');
      else if (!cat) errors.push(`فئة غير موجودة: ${r.category}`);
      else if (cat.id !== p.category_id) {
        update.category_id = cat.id;
        changes.push(`الفئة: ${norm(p.categories?.name_ar)} ← ${cat.name_ar}`);
      }

      // Section (optional — blank clears it; an unknown name is created on apply)
      const sec = r.section ? secByName.get(key(r.section)) : null;
      const oldSection = p.section_id ? sectionName.get(p.section_id) ?? '—' : '—';
      let newSectionName: string | undefined;
      if (r.section && !sec) {
        if (r.section.length < 2) errors.push(`اسم القسم قصير جداً: ${r.section}`);
        else {
          newSectionName = r.section;
          changes.push(`القسم: ${oldSection} ← ${r.section} (قسم جديد)`);
        }
      } else if ((sec?.id ?? null) !== (p.section_id ?? null)) {
        update.section_id = sec?.id ?? null;
        changes.push(`القسم: ${oldSection} ← ${sec?.name_ar ?? '—'}`);
      }

      // Brand (optional — blank clears it; an unknown name is created on apply)
      const br = r.brand ? brandByName.get(key(r.brand)) : null;
      let newBrandName: string | undefined;
      if (r.brand && !br) {
        if (r.brand.length < 2) errors.push(`اسم الماركة قصير جداً: ${r.brand}`);
        else {
          newBrandName = r.brand;
          changes.push(`الماركة: ${norm(p.brands?.name) || '—'} ← ${r.brand} (ماركة جديدة)`);
        }
      } else if ((br?.id ?? null) !== (p.brand_id ?? null)) {
        update.brand_id = br?.id ?? null;
        changes.push(`الماركة: ${norm(p.brands?.name) || '—'} ← ${br?.name ?? '—'}`);
      }

      // Prices per unit
      const priced = planUnits(r, p, errors);
      const units = priced?.units;
      if (priced) changes.push(...priced.changes);

      // Quantity
      const qty = toNumber(r.qty);
      if (qty === null) errors.push('الكمية فارغة');
      else if (Number.isNaN(qty) || qty < 0 || !Number.isInteger(qty)) errors.push(`كمية غير صحيحة: ${String(r.qty)}`);
      else if (qty !== (p.stock_quantity ?? 0)) {
        update.stock_quantity = qty;
        changes.push(`الكمية: ${p.stock_quantity ?? 0} ← ${qty}`);
      }

      if (errors.length) return { ...base, status: 'error', reason: errors.join('، '), changes };
      if (!changes.length) return { ...base, status: 'unchanged', reason: null };
      return { ...base, status: 'ready', reason: null, changes, update, units, newSectionName, newBrandName };
    });
}

/** The product's unit list after this row, or null when prices didn't change
 * (or had errors, pushed onto `errors`). */
function planUnits(r: SheetRow, p: Product, errors: string[]): { units: ProductUnitInput[]; changes: string[] } | null {
  const current = getProductUnits(p);                    // main unit first
  const byUnit = new Map(current.map((u) => [u.unit, u]));
  const wanted = new Map<SaleUnit, number>();            // unit → new price

  if (r.legacyPrice !== undefined) {
    // Old sheet: one price, for the main unit; other units stay as they are.
    const price = toNumber(r.legacyPrice);
    if (price === null) { errors.push('السعر فارغ'); return null; }
    if (Number.isNaN(price) || price <= 0) { errors.push(`سعر غير صحيح: ${String(r.legacyPrice)}`); return null; }
    current.forEach((u, i) => wanted.set(u.unit, i === 0 ? price : u.price));
    if (!current.length) wanted.set('piece', price);
  } else {
    for (const u of UNIT_ORDER) {
      if (!(u in r.prices)) {                             // no column: leave as is
        const old = byUnit.get(u);
        if (old) wanted.set(u, old.price);
        continue;
      }
      const price = toNumber(r.prices[u]);
      if (price === null) continue;                       // blank: not sold in this unit
      if (Number.isNaN(price) || price <= 0) errors.push(`سعر ${UNIT_NAME[u]} غير صحيح: ${String(r.prices[u])}`);
      else wanted.set(u, price);
    }
    if (!wanted.size && !errors.length) errors.push('لا يوجد أي سعر — أدخل سعر وحدة واحدة على الأقل');
  }
  for (const [u, price] of wanted) wanted.set(u, Math.round(price * 1000) / 1000);

  // Pieces per carton
  let cartonPieces = byUnit.get('carton')?.pieces_per_unit ?? null;
  if (r.cartonPieces !== undefined) {
    const n = toNumber(r.cartonPieces);
    if (n === null) cartonPieces = null;
    else if (Number.isNaN(n) || n <= 0 || !Number.isInteger(n)) errors.push(`حبات الكرتونة غير صحيحة: ${String(r.cartonPieces)}`);
    else cartonPieces = n;
  }

  // Main unit: the sheet's choice, else the current one if still sold, else the first sold.
  let main: SaleUnit | undefined;
  if (r.mainUnit) {
    const u = parseUnit(r.mainUnit);
    if (!u) errors.push(`وحدة أساسية غير معروفة: ${r.mainUnit} (حبة / كيلو / كرتونة / تنكة)`);
    else if (!wanted.has(u)) errors.push(`الوحدة الأساسية "${r.mainUnit}" بدون سعر`);
    else main = u;
  }
  main ??= current[0] && wanted.has(current[0].unit) ? current[0].unit : UNIT_ORDER.find((u) => wanted.has(u));
  if (errors.length || !main) return null;

  // Changes, for the preview
  const changes: string[] = [];
  for (const u of UNIT_ORDER) {
    const before = byUnit.get(u)?.price;
    const after = wanted.get(u);
    if (before == null && after == null) continue;
    if (before == null) changes.push(`سعر ${UNIT_NAME[u]}: — ← ${fmt(after!)} (وحدة جديدة)`);
    else if (after == null) changes.push(`سعر ${UNIT_NAME[u]}: ${fmt(before)} ← — (إيقاف البيع بها)`);
    else if (Math.abs(after - before) > 0.0005) changes.push(`سعر ${UNIT_NAME[u]}: ${fmt(before)} ← ${fmt(after)}`);
  }
  if (wanted.has('carton') && cartonPieces !== (byUnit.get('carton')?.pieces_per_unit ?? null)) {
    changes.push(`حبات الكرتونة: ${byUnit.get('carton')?.pieces_per_unit ?? '—'} ← ${cartonPieces ?? '—'}`);
  }
  if (current[0] && main !== current[0].unit) changes.push(`الوحدة الأساسية: ${UNIT_NAME[current[0].unit]} ← ${UNIT_NAME[main]}`);
  if (!changes.length) return null;

  // Main unit first, the rest in their current order, new ones after.
  const order = [main, ...current.map((u) => u.unit), ...UNIT_ORDER].filter((u, i, a) => wanted.has(u) && a.indexOf(u) === i);
  const units = order.map((u): ProductUnitInput => {
    const old: ProductUnit | undefined = byUnit.get(u);
    const price = wanted.get(u)!;
    // A sale has to stay below the new price; drop it otherwise.
    const keepSale = old?.sale_price != null && old.sale_price < price;
    return {
      unit: u, price,
      sale_price: keepSale ? old!.sale_price : null, sale_ends_at: keepSale ? old!.sale_ends_at : null,
      min_qty: old?.min_qty ?? 1,
      pieces_per_unit: u === 'carton' ? cartonPieces : old?.pieces_per_unit ?? null,
      is_default: u === main,
    };
  });
  return { units, changes };
}

// ─── Import: apply ────────────────────────────────────────────────────────────

export interface ApplyResult {
  updated: number;
  createdSections: string[];
  createdBrands: string[];
  failed: { rowNumber: number; name: string; message: string }[];
}

export async function applyPlan(
  rows: PlanRow[],
  existingSections: Section[],
  existingBrands: Brand[],
  onProgress?: (done: number, total: number) => void,
): Promise<ApplyResult> {
  const ready = rows.filter((r) => r.status === 'ready' && r.update && r.productId);
  const result: ApplyResult = { updated: 0, createdSections: [], createdBrands: [], failed: [] };

  // 1. Create each new section / brand once, at the end of the current order
  async function createAll(
    table: 'sections' | 'brands',
    names: string[],
    existing: { sort_order: number }[],
    row: (name: string, order: number) => Record<string, unknown>,
    created: string[],
  ) {
    const ids = new Map<string, string>();
    const errors = new Map<string, string>();
    let nextOrder = existing.reduce((m, x) => Math.max(m, x.sort_order ?? 0), 0) + 1;
    for (const name of names) {
      const { data, error } = await (supabase.from(table) as any).insert(row(name, nextOrder++)).select('id').single();
      if (error) errors.set(key(name), error.message);
      else { ids.set(key(name), data.id); created.push(name); }
    }
    return { ids, errors };
  }
  const sec = await createAll('sections', newSectionsInPlan(ready), existingSections,
    (name, order) => ({ name_ar: name, is_active: true, sort_order: order }), result.createdSections);
  const brd = await createAll('brands', newBrandsInPlan(ready), existingBrands,
    (name, order) => ({ name, is_active: true, sort_order: order }), result.createdBrands);

  for (const r of ready) {
    if (r.newSectionName) {
      const id = sec.ids.get(key(r.newSectionName));
      if (id) r.update!.section_id = id;
    }
    if (r.newBrandName) {
      const id = brd.ids.get(key(r.newBrandName));
      if (id) r.update!.brand_id = id;
    }
  }

  // 2. Update products
  let done = 0;
  // Small batches in parallel: fast enough for a few hundred rows without
  // hammering the server
  for (let i = 0; i < ready.length; i += 8) {
    const batch = ready.slice(i, i + 8);
    await Promise.all(batch.map(async (r) => {
      const secErr = r.newSectionName ? sec.errors.get(key(r.newSectionName)) : undefined;
      if (secErr) {
        result.failed.push({ rowNumber: r.rowNumber, name: r.name, message: `تعذّر إنشاء القسم "${r.newSectionName}": ${secErr}` });
        return;
      }
      const brdErr = r.newBrandName ? brd.errors.get(key(r.newBrandName)) : undefined;
      if (brdErr) {
        result.failed.push({ rowNumber: r.rowNumber, name: r.name, message: `تعذّر إنشاء الماركة "${r.newBrandName}": ${brdErr}` });
        return;
      }
      if (Object.keys(r.update!).length) {
        const { error } = await (supabase.from('products') as any).update(r.update).eq('id', r.productId);
        if (error) { result.failed.push({ rowNumber: r.rowNumber, name: r.name, message: error.message }); return; }
      }
      if (r.units) {
        try {
          await saveProductUnits(r.productId!, r.units);
        } catch (e) {
          result.failed.push({ rowNumber: r.rowNumber, name: r.name, message: `السعر: ${(e as Error).message}` });
          return;
        }
      }
      result.updated += 1;
    }));
    done += batch.length;
    onProgress?.(done, ready.length);
  }
  return result;
}
