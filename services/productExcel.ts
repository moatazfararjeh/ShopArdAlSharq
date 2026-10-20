// Bulk product sheet: export every product to Excel, let the client fill in
// name / category / section / brand / price / quantity, then import it back
// with a preview before anything is written.
//
// Price rule (same as the admin edit form and sync-price-from-units.mjs): the
// main `price` always mirrors the product's main unit price, chosen
// carton > kg > piece. The sheet has one "السعر" column for that main unit;
// importing it updates both the unit price and `price`, so the cart (which
// charges by unit price) and the listing stay consistent.

import { supabase } from '@/lib/supabase';
import type { Product, Category, Section, Brand } from '@/types/models';

export const COL = {
  id:       'رقم المنتج (لا تعدّل)',
  erp:      'كود ERP',
  name:     'اسم المنتج',
  category: 'الفئة',
  section:  'القسم',
  brand:    'الماركة',
  unit:     'الوحدة',
  price:    'السعر (د.أ)',
  qty:      'الكمية',
} as const;

type UnitPriceKey = 'price_per_carton' | 'price_per_kg' | 'price_per_piece';

/** The unit field that the main price mirrors, or null if none is set. */
function mainUnitKey(p: Product): UnitPriceKey | null {
  if (p.price_per_carton != null) return 'price_per_carton';
  if (p.price_per_kg != null) return 'price_per_kg';
  if (p.price_per_piece != null) return 'price_per_piece';
  return null;
}

function unitLabel(p: Product): string {
  const key = mainUnitKey(p);
  if (key === 'price_per_carton') return p.pieces_per_carton ? `كرتونة · ${p.pieces_per_carton} حبة` : 'كرتونة';
  if (key === 'price_per_kg') return 'كيلو';
  if (key === 'price_per_piece') return 'حبة';
  return p.unit_type === 'carton' ? 'كرتونة' : p.unit_type === 'kg' ? 'كيلو' : p.unit_type === 'tin' ? 'تنكة' : 'حبة';
}

function currentPrice(p: Product): number {
  const key = mainUnitKey(p);
  return Number(key ? p[key] : p.price);
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
      [COL.unit]: unitLabel(p),
      [COL.price]: currentPrice(p),
      [COL.qty]: p.stock_quantity ?? 0,
    }));

  const ws = XLSX.utils.json_to_sheet(rows, { header: Object.values(COL) });
  ws['!cols'] = [{ wch: 38 }, { wch: 12 }, { wch: 40 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 10 }];
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
    ['• السعر بالدينار لوحدة البيع في عمود "الوحدة". الكمية رقم صحيح.'],
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
  price: unknown;
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
  return raw.map((r, i) => ({
    rowNumber: i + 2,
    id: norm(r[COL.id]),
    name: norm(r[COL.name]),
    category: norm(r[COL.category]),
    section: norm(r[COL.section]),
    brand: norm(r[COL.brand]),
    price: r[COL.price],
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

      // Price — main unit price + mirrored main price
      const price = toNumber(r.price);
      if (price === null) errors.push('السعر فارغ');
      else if (Number.isNaN(price) || price < 0) errors.push(`سعر غير صحيح: ${String(r.price)}`);
      else {
        // Unit prices keep 3 decimals (fils); the main price column only keeps 2
        const unitKey = mainUnitKey(p);
        const rounded = unitKey ? Math.round(price * 1000) / 1000 : Math.round(price * 100) / 100;
        const old = currentPrice(p);
        if (Math.abs(rounded - old) > 0.0005) {
          if (unitKey) update[unitKey] = rounded;
          update.price = rounded;
          changes.push(`السعر: ${old.toFixed(3)} ← ${rounded.toFixed(3)}`);
        }
      }

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
      return { ...base, status: 'ready', reason: null, changes, update, newSectionName, newBrandName };
    });
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
      const { error } = await (supabase.from('products') as any).update(r.update).eq('id', r.productId);
      if (error) result.failed.push({ rowNumber: r.rowNumber, name: r.name, message: error.message });
      else result.updated += 1;
    }));
    done += batch.length;
    onProgress?.(done, ready.length);
  }
  return result;
}
