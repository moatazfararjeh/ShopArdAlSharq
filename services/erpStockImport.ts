import { supabase } from '@/lib/supabase';
import type { Product } from '@/types/models';

const HEADER_CODE = 'رمز المادة';

export interface ErpRow {
  code: string;
  name: string;
  baseUnit: string;
  baseBalance: number;
  largeUnit: string;
  largeBalance: number | null;
}

export type PlanStatus =
  | 'ready'
  | 'unchanged'
  | 'not_linked'
  | 'unit_mismatch'
  | 'no_unit_type'
  | 'duplicate'
  | 'fractional';

export interface PlanItem {
  status: PlanStatus;
  erpCode: string;
  erpName: string;
  productId: string | null;
  productName: string | null;
  before: number | null;
  after: number | null;
  reason: string | null;
}

export interface ImportPlan {
  items: PlanItem[];
  missingFromFile: Product[];
}

export async function parseErpStockFile(buffer: ArrayBuffer): Promise<ErpRow[]> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });

  const headerIdx = raw.findIndex((r) => r[1] === HEADER_CODE);
  if (headerIdx === -1) throw new Error('الملف لا يطابق صيغة تقرير أرصدة المواد من النظام');

  const rows: ErpRow[] = [];
  for (const r of raw.slice(headerIdx + 1)) {
    const code = r[1] == null ? '' : String(r[1]).trim();
    if (!code || code === HEADER_CODE || r[3] === 'الوحدة') continue;
    if (typeof r[5] !== 'number') continue;
    rows.push({
      code,
      name: String(r[2] ?? '').trim(),
      baseUnit: String(r[3] ?? '').trim(),
      baseBalance: r[5],
      largeUnit: String(r[8] ?? '').trim(),
      largeBalance: typeof r[9] === 'number' ? r[9] : null,
    });
  }
  return rows;
}

function targetFor(product: Product, row: ErpRow): { value: number | null; reason: string | null } {
  switch (product.unit_type) {
    case 'carton':
      if (row.baseUnit === 'كرتونة') return { value: row.baseBalance, reason: null };
      if (row.largeUnit === 'كرتونة' && row.largeBalance != null) return { value: row.largeBalance, reason: null };
      return { value: null, reason: `المنتج بالكرتون والملف بوحدة ${row.baseUnit}` };
    case 'piece':
      if (row.baseUnit === 'حبة') return { value: row.baseBalance, reason: null };
      return { value: null, reason: `المنتج بالحبة والملف بوحدة ${row.baseUnit}` };
    case 'kg':
      if (row.baseUnit === 'كيلو') return { value: row.baseBalance, reason: null };
      return { value: null, reason: `المنتج بالكيلو والملف بوحدة ${row.baseUnit}` };
    default:
      return { value: null, reason: null };
  }
}

export function buildImportPlan(rows: ErpRow[], products: Product[]): ImportPlan {
  const countByCode = new Map<string, number>();
  for (const r of rows) countByCode.set(r.code, (countByCode.get(r.code) ?? 0) + 1);

  const productByCode = new Map<string, Product>();
  for (const p of products) if (p.erp_code) productByCode.set(p.erp_code, p);

  const items: PlanItem[] = rows.map((row) => {
    const base: PlanItem = {
      status: 'not_linked',
      erpCode: row.code,
      erpName: row.name,
      productId: null,
      productName: null,
      before: null,
      after: null,
      reason: null,
    };

    if ((countByCode.get(row.code) ?? 0) > 1) {
      return { ...base, status: 'duplicate', reason: 'الكود مكرر في الملف' };
    }

    const product = productByCode.get(row.code);
    if (!product) {
      return { ...base, reason: 'لا يوجد منتج مربوط بهذا الكود' };
    }

    const withProduct: PlanItem = {
      ...base,
      productId: product.id,
      productName: product.name_ar,
      before: product.stock_quantity,
    };

    if (product.unit_type == null) {
      return { ...withProduct, status: 'no_unit_type', reason: 'لم يتم تحديد نوع الوحدة للمنتج' };
    }

    const { value, reason } = targetFor(product, row);
    if (value == null) {
      return { ...withProduct, status: 'unit_mismatch', reason };
    }
    if (!Number.isInteger(value)) {
      return { ...withProduct, status: 'fractional', after: value, reason: 'الرصيد ليس عدداً صحيحاً' };
    }
    if (value === product.stock_quantity) {
      return { ...withProduct, status: 'unchanged', after: value };
    }
    return { ...withProduct, status: 'ready', after: value };
  });

  const fileCodes = new Set(rows.map((r) => r.code));
  const missingFromFile = products.filter((p) => p.erp_code && !fileCodes.has(p.erp_code));

  return { items, missingFromFile };
}

export interface ApplyResult {
  updated: number;
  conflicts: PlanItem[];
  failed: { item: PlanItem; message: string }[];
}

export async function applyImportPlan(
  items: PlanItem[],
  onProgress: (done: number, total: number) => void,
): Promise<ApplyResult> {
  const ready = items.filter((i) => i.status === 'ready');
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const result: ApplyResult = { updated: 0, conflicts: [], failed: [] };

  for (let i = 0; i < ready.length; i++) {
    const item = ready[i];
    onProgress(i, ready.length);

    const { data, error } = await (supabase.from('products') as any)
      .update({ stock_quantity: item.after })
      .eq('id', item.productId)
      .eq('stock_quantity', item.before)
      .select('id');

    if (error) {
      result.failed.push({ item, message: error.message });
      continue;
    }
    if (!data || data.length === 0) {
      result.conflicts.push(item);
      continue;
    }

    const { error: logError } = await (supabase.from('inventory_logs') as any).insert({
      product_id: item.productId,
      action: 'adjustment',
      quantity_change: (item.after as number) - (item.before as number),
      quantity_before: item.before,
      quantity_after: item.after,
      note: `استيراد أرصدة ERP — كود ${item.erpCode}`,
      performed_by: userId,
    });
    if (logError) {
      result.failed.push({ item, message: `تم تحديث الكمية لكن فشل تسجيل الحركة: ${logError.message}` });
      continue;
    }
    result.updated++;
  }

  onProgress(ready.length, ready.length);
  return result;
}
