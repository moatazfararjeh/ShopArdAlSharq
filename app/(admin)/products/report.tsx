import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProductsPage, useUpdateProduct, useSaveProductUnits } from '@/hooks/useProducts';
import type { ProductUnitInput } from '@/services/productService';
import { useBrands } from '@/hooks/useBrands';
import { useCategories } from '@/hooks/useCategories';
import { useSections } from '@/hooks/useSections';
import { getCurrentLocale, SupportedLocale } from '@/i18n';
import { getProductName, getProductUnits, SaleUnit, UNIT_LABELS } from '@/types/models';
import { useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/lib/theme';
import { AdminHeader, AdminButton, AdminSearch, AdminChip } from '@/components/admin/AdminUI';

const C = {
  bg:    COLORS.surface,
  card:  '#ffffff',
  brand: COLORS.brandText,
  text:  COLORS.ink,
  muted: COLORS.muted,
  line:  COLORS.line,
};

// The table needs this much width; narrower screens scroll it sideways.
const TABLE_MIN_WIDTH = 1440;

const UNIT_TYPE_OPTIONS = [
  { id: 'piece', name: 'حبة' },
  { id: 'kg', name: 'كيلو' },
  { id: 'carton', name: 'كرتون' },
  { id: 'tin', name: 'تنك' },
];

type MissingFilter = 'section' | 'weight' | 'price' | 'erp_code';

const MISSING_FILTER_OPTIONS: { id: MissingFilter; label: string }[] = [
  { id: 'section', label: 'بدون قسم' },
  { id: 'weight', label: 'بدون وزن' },
  { id: 'price', label: 'بدون سعر' },
  { id: 'erp_code', label: 'بدون كود ERP' },
];

function isMissingField(product: any, filter: MissingFilter): boolean {
  switch (filter) {
    case 'section': return !product.section_id;
    case 'weight': return product.weight == null;
    case 'price': return product.price == null;
    case 'erp_code': return !product.erp_code;
  }
}

function exportToExcel(rows: any[]) {
  if (Platform.OS !== 'web') return;
  import('xlsx').then((XLSX) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 12 }, { wch: 16 }, { wch: 40 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'تقرير المنتجات');
    XLSX.writeFile(wb, 'products-report.xlsx');
  });
}

// Alert.alert is a no-op on web, so errors there go through window.alert.
function showError(message: string) {
  Platform.OS === 'web' ? window.alert(message) : Alert.alert('خطأ', message);
}

// Only one cell edits at a time: opening an editor closes the one already open.
let closeActiveEditor: (() => void) | null = null;

function useSingleEditor() {
  const [editing, setEditing] = useState(false);
  const close = useCallback(() => setEditing(false), []);
  useEffect(() => () => { if (closeActiveEditor === close) closeActiveEditor = null; }, [close]);
  return {
    editing,
    open() {
      if (closeActiveEditor && closeActiveEditor !== close) closeActiveEditor();
      closeActiveEditor = close;
      setEditing(true);
    },
    done() {
      if (closeActiveEditor === close) closeActiveEditor = null;
      setEditing(false);
    },
  };
}

// A table cell; minWidth 0 keeps wide content (inputs) from stretching the column.
const cellStyle = { flex: 2, minWidth: 0, paddingHorizontal: 4 } as const;

function CellSpinner() {
  return (
    <View style={{ ...cellStyle, alignItems: 'flex-end' }}>
      <ActivityIndicator size="small" color={C.brand} />
    </View>
  );
}

/**
 * Input + save/cancel. Columns are narrow, so the editor floats over the
 * neighbouring cells (anchored to its own cell) instead of widening the column.
 * Enter saves, Esc cancels.
 */
function CellEditor({ draft, setDraft, numeric, onSave, onCancel }: {
  draft: string;
  setDraft: (v: string) => void;
  numeric?: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={{ ...cellStyle, height: 32, zIndex: 10 }}>
    <View style={{
      position: 'absolute', right: 0, top: -4, width: 180, zIndex: 10,
      flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4, borderRadius: 10, backgroundColor: '#fff',
      shadowColor: '#1C1917', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    }}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        autoFocus
        selectTextOnFocus
        onSubmitEditing={onSave}
        onKeyPress={(e) => { if (e.nativeEvent.key === 'Escape') onCancel(); }}
        style={{
          flex: 1, width: 0, minWidth: 0, height: 32, borderWidth: 1, borderColor: C.brand, borderRadius: 8,
          paddingHorizontal: 6, fontSize: 13, color: C.text, textAlign: 'right', backgroundColor: '#fff',
        } as any}
      />
      <TouchableOpacity onPress={onSave} accessibilityLabel="حفظ" style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="checkmark" size={16} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity onPress={onCancel} accessibilityLabel="إلغاء" style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="close" size={16} color={C.muted} />
      </TouchableOpacity>
    </View>
    </View>
  );
}

function CellDisplay({ text, filled, bold, onPress }: { text: string; filled: boolean; bold?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={cellStyle} onPress={onPress}>
      <Text style={{ fontSize: 13, color: filled ? (bold ? C.brand : C.text) : C.muted, fontWeight: filled ? (bold ? '700' : '600') : '400', textAlign: 'right' }} numberOfLines={2}>
        {text}
      </Text>
      <Ionicons name="pencil-outline" size={11} color={C.muted} style={{ position: 'absolute', left: 0, top: '50%', marginTop: -6 }} />
    </TouchableOpacity>
  );
}

// ─── Inline-editable number cell ──────────────────────────────────────────────
function EditableCell({
  value,
  onSave,
  suffix,
  numeric,
}: {
  value: number | null;
  onSave: (v: number | null) => Promise<void>;
  suffix?: string;
  numeric?: boolean;
}) {
  const editor = useSingleEditor();
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  async function commit() {
    const parsed = draft.trim() === '' ? null : parseFloat(draft.replace(',', '.'));
    if (parsed !== null && isNaN(parsed)) {
      showError('يرجى إدخال رقم صحيح');
      return;
    }
    editor.done();
    if (parsed === value) return;
    setSaving(true);
    try {
      await onSave(parsed);
    } catch (e: any) {
      showError(e?.message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  }

  if (saving) return <CellSpinner />;
  if (editor.editing) {
    return <CellEditor draft={draft} setDraft={setDraft} numeric={numeric} onSave={commit} onCancel={editor.done} />;
  }
  return (
    <CellDisplay
      text={value != null ? `${value}${suffix ?? ''}` : '—'}
      filled={value != null}
      bold
      onPress={() => { setDraft(value != null ? String(value) : ''); editor.open(); }}
    />
  );
}

// ─── Inline-editable text cell (ERP code) ────────────────────────────────────
function EditableTextCell({
  value,
  onSave,
}: {
  value: string | null;
  onSave: (v: string | null) => Promise<void>;
}) {
  const editor = useSingleEditor();
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  async function commit() {
    const next = draft.trim() === '' ? null : draft.trim();
    editor.done();
    if (next === value) return;
    setSaving(true);
    try {
      await onSave(next);
    } catch (e: any) {
      showError(e?.message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  }

  if (saving) return <CellSpinner />;
  if (editor.editing) {
    return <CellEditor draft={draft} setDraft={setDraft} onSave={commit} onCancel={editor.done} />;
  }
  return (
    <CellDisplay
      text={value ?? '—'}
      filled={!!value}
      onPress={() => { setDraft(value ?? ''); editor.open(); }}
    />
  );
}

// ─── Inline-editable select cell (category / brand) ──────────────────────────
function EditableSelectCell({
  value,
  options,
  onSave,
  allowNone,
  noneLabel,
}: {
  value: string | null;
  options: { id: string; name: string }[];
  onSave: (id: string | null) => Promise<void>;
  allowNone?: boolean;
  noneLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentName = options.find((o) => o.id === value)?.name ?? (allowNone ? (noneLabel ?? '—') : '—');

  async function choose(id: string | null) {
    setOpen(false);
    if (id === value) return;
    setSaving(true);
    try {
      await onSave(id);
    } catch (e: any) {
      showError(e?.message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  }

  if (saving) return <CellSpinner />;

  const listData = allowNone ? [{ id: '__none__', name: noneLabel ?? 'بدون' }, ...options] : options;

  return (
    <>
      <TouchableOpacity
        style={cellStyle}
        onPress={() => setOpen(true)}
      >
        <Text numberOfLines={2} ellipsizeMode="tail" style={{ fontSize: 13, color: value != null ? C.brand : C.muted, fontWeight: value != null ? '700' : '400', textAlign: 'right' }}>
          {currentName}
        </Text>
        <Ionicons name="pencil-outline" size={11} color={C.muted} style={{ position: 'absolute', left: 0, top: '50%', marginTop: -6 }} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{
            width: 300, maxHeight: 420, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
          }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.text, textAlign: 'right' }}>اختر قيمة</Text>
            </View>
            <FlatList
              data={listData}
              style={{ maxHeight: 360 }}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const itemValue = item.id === '__none__' ? null : item.id;
                const selected = itemValue === value;
                return (
                  <TouchableOpacity
                    onPress={() => choose(itemValue)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingHorizontal: 16, paddingVertical: 12,
                      borderBottomWidth: 1, borderBottomColor: C.line,
                      backgroundColor: selected ? '#fff7ed' : '#fff',
                    }}
                  >
                    {selected && <Ionicons name="checkmark" size={16} color={C.brand} />}
                    <Text style={{ flex: 1, fontSize: 14, color: selected ? C.brand : C.text, fontWeight: selected ? '700' : '400', textAlign: 'right' }}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────
function ProductRow({ product, locale, idx, categoryOptions, sectionOptions, brandOptions }: {
  product: any; locale: SupportedLocale; idx: number;
  categoryOptions: { id: string; name: string }[];
  sectionOptions: { id: string; name: string }[];
  brandOptions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const update = useUpdateProduct(product.id);

  const save = useCallback(async (patch: Record<string, number | string | null>) => {
    await update.mutateAsync(patch as any);
    queryClient.invalidateQueries({ queryKey: ['products'] });
  }, [update, queryClient]);

  // Prices live per selling unit: every price cell rewrites the product's unit list.
  const saveUnits = useSaveProductUnits();
  const units = getProductUnits(product);
  const def = units[0];
  const unitOf = (unit: SaleUnit) => units.find((u) => u.unit === unit);

  async function editUnits(change: (list: ProductUnitInput[]) => ProductUnitInput[]) {
    const list: ProductUnitInput[] = units.map((u) => ({
      unit: u.unit, price: u.price, sale_price: u.sale_price, sale_ends_at: u.sale_ends_at,
      min_qty: u.min_qty, pieces_per_unit: u.pieces_per_unit, is_default: u.is_default,
    }));
    const next = change(list);
    if (!next.length) throw new Error('يجب أن يبقى للمنتج وحدة بيع واحدة على الأقل.');
    if (!next.some((u) => u.is_default)) next[0].is_default = true;
    await saveUnits.mutateAsync({ productId: product.id, units: next });
  }

  /** Set a unit's price; empty removes the unit, a new price adds it. */
  function setUnitPrice(unit: SaleUnit, price: number | null) {
    if (price != null && !(price > 0)) throw new Error('السعر يجب أن يكون أكبر من صفر.');
    return editUnits((list) => {
      if (price == null) return list.filter((u) => u.unit !== unit);
      const existing = list.find((u) => u.unit === unit);
      if (!existing) return [...list, { unit, price, sale_price: null, sale_ends_at: null, min_qty: 1, pieces_per_unit: null, is_default: false }];
      existing.price = price;
      // A sale must stay below the price; drop it if the new price is lower.
      if (existing.sale_price != null && existing.sale_price >= price) { existing.sale_price = null; existing.sale_ends_at = null; }
      return list;
    });
  }

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: idx % 2 === 0 ? C.card : '#FBFAF8',
      paddingHorizontal: 12, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: C.line,
    }}>
      <TouchableOpacity
        style={{ flex: 3, minWidth: 0, paddingHorizontal: 4 }}
        onPress={() => router.push(`/(admin)/products/${product.id}/edit` as any)}
      >
        <Text style={{ fontSize: 13, fontWeight: '600', color: C.brand, textAlign: 'right' }} numberOfLines={2}>
          {getProductName(product, locale)}
        </Text>
      </TouchableOpacity>
      <EditableTextCell
        value={product.erp_code ?? null}
        onSave={(v) => save({ erp_code: v })}
      />
      <EditableSelectCell
        value={product.category_id ?? null}
        options={categoryOptions}
        onSave={(v) => save({ category_id: v })}
      />
      <EditableSelectCell
        value={product.section_id ?? null}
        options={sectionOptions}
        onSave={(v) => save({ section_id: v })}
        allowNone
        noneLabel="بدون قسم"
      />
      <EditableSelectCell
        value={product.brand_id ?? null}
        options={brandOptions}
        onSave={(v) => save({ brand_id: v })}
        allowNone
        noneLabel="بدون ماركة"
      />
      {/* Default unit: chosen among the units the product already has a price for. */}
      <EditableSelectCell
        value={def?.unit ?? null}
        options={units.map((u) => ({ id: u.unit, name: UNIT_LABELS[u.unit] }))}
        onSave={(v) => editUnits((list) => list.map((u) => ({ ...u, is_default: u.unit === v })))}
      />
      <EditableCell
        value={def?.min_qty ?? null}
        onSave={async (v) => {
          if (v == null || !Number.isInteger(v) || v < 1) {
            throw new Error('أدنى كمية للبيع يجب أن تكون رقمًا صحيحًا 1 أو أكثر');
          }
          await editUnits((list) => list.map((u) => (u.is_default ? { ...u, min_qty: v } : u)));
        }}
        numeric
      />
      <EditableCell
        value={def?.price ?? null}
        onSave={async (v) => {
          if (v == null) throw new Error('سعر الوحدة الافتراضية مطلوب.');
          await setUnitPrice(def.unit, v);
        }}
        suffix=" د.أ"
        numeric
      />
      <EditableCell
        value={unitOf('piece')?.price ?? null}
        onSave={(v) => setUnitPrice('piece', v)}
        suffix=" د.أ"
        numeric
      />
      <EditableCell
        value={unitOf('kg')?.price ?? null}
        onSave={(v) => setUnitPrice('kg', v)}
        suffix=" د.أ"
        numeric
      />
      <EditableCell
        value={unitOf('carton')?.price ?? null}
        onSave={(v) => setUnitPrice('carton', v)}
        suffix=" د.أ"
        numeric
      />
      <EditableCell
        value={unitOf('carton')?.pieces_per_unit ?? null}
        onSave={async (v) => {
          if (!unitOf('carton')) throw new Error('أدخل سعر الكرتون أولاً.');
          if (v != null && (!Number.isInteger(v) || v < 1)) throw new Error('عدد الحبات يجب أن يكون رقمًا صحيحًا 1 أو أكثر.');
          await editUnits((list) => list.map((u) => (u.unit === 'carton' ? { ...u, pieces_per_unit: v } : u)));
        }}
        suffix=" حبة"
        numeric
      />
      <EditableCell
        value={product.weight}
        onSave={(v) => save({ weight: v })}
        suffix={` ${product.weight_unit ?? 'kg'}`}
        numeric
      />
    </View>
  );
}

// ─── Brand section header ─────────────────────────────────────────────────────
function BrandHeader({
  name,
  count,
  collapsed,
  onToggle,
}: {
  name: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14, paddingVertical: 10,
        backgroundColor: COLORS.brandTint,
        borderTopWidth: 1, borderTopColor: C.line,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, textAlign: 'right' }}>{name}</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: C.brand }}>{count}</Text>
      </View>
      <Ionicons
        name={collapsed ? 'chevron-back' : 'chevron-down'}
        size={16}
        color={C.muted}
      />
    </TouchableOpacity>
  );
}

// ─── Column filter (Excel-style multi-select) ────────────────────────────────
const EMPTY_VALUE = '—';

interface ReportColumn {
  key: string;
  label: string;
  flex: number;
  /** The value shown for the product in this column; also what the filter matches. */
  value: (p: any) => string;
}

function ColumnFilterModal({ column, options, selected, onApply, onClose }: {
  column: ReportColumn;
  /** Distinct values with how many rows have each. */
  options: { value: string; count: number }[];
  /** Current filter; empty means no filter (everything shown). */
  selected: Set<string>;
  onApply: (next: Set<string>) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Set<string>>(() => new Set(selected));
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const visible = q ? options.filter((o) => o.value.toLowerCase().includes(q)) : options;

  function toggle(value: string) {
    setDraft((prev) => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(28,25,23,0.45)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ width: '100%', maxWidth: 360, maxHeight: '85%', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', direction: 'rtl' as any }}>
          <View style={{ padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'right' }}>تصفية: {column.label}</Text>
            <AdminSearch value={query} onChangeText={setQuery} placeholder="بحث في القيم" />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setDraft((prev) => new Set([...prev, ...visible.map((o) => o.value)]))}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: C.brand }}>تحديد الكل</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDraft(new Set())}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: C.muted }}>إلغاء التحديد</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <Text style={{ fontSize: 12, color: C.muted }}>{draft.size} محدد</Text>
            </View>
          </View>

          <FlatList
            data={visible}
            keyExtractor={(o) => o.value}
            style={{ maxHeight: 340 }}
            ListEmptyComponent={<Text style={{ padding: 16, color: C.muted, textAlign: 'center' }}>لا توجد قيم مطابقة</Text>}
            renderItem={({ item }) => {
              const on = draft.has(item.value);
              return (
                <TouchableOpacity
                  onPress={() => toggle(item.value)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }}
                >
                  <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: on ? COLORS.brandFill : C.line, backgroundColor: on ? COLORS.brandFill : '#fff', alignItems: 'center', justifyContent: 'center' }}>
                    {on && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, color: C.text, textAlign: 'right' }} numberOfLines={2}>
                    {item.value === EMPTY_VALUE ? '(فارغ)' : item.value}
                  </Text>
                  <Text style={{ fontSize: 12, color: C.muted }}>{item.count}</Text>
                </TouchableOpacity>
              );
            }}
          />

          <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: C.line }}>
            <TouchableOpacity
              onPress={() => onApply(draft.size === options.length ? new Set() : draft)}
              style={{ flex: 1, height: 44, borderRadius: 10, backgroundColor: COLORS.brandFill, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>تطبيق</Text>
            </TouchableOpacity>
            {selected.size > 0 && (
              <TouchableOpacity
                onPress={() => onApply(new Set())}
                style={{ height: 44, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>إزالة الفلتر</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={{ height: 44, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: C.muted }}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ProductsReportScreen() {
  const router = useRouter();
  const locale = getCurrentLocale();
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [activeMissingFilters, setActiveMissingFilters] = useState<Set<MissingFilter>>(new Set());

  function toggleMissingFilter(id: MissingFilter) {
    setActiveMissingFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const { data, isLoading } = useProductsPage({ availableOnly: false, page: 0, limit: 9999 });
  const { data: brands } = useBrands(false);
  const { data: categories } = useCategories(false);
  const { data: sections } = useSections(false);

  const categoryOptions = useMemo(
    () => (categories ?? []).map((c) => ({ id: c.id, name: c.name_ar })),
    [categories],
  );
  const sectionOptions = useMemo(
    () => (sections ?? []).map((s) => ({ id: s.id, name: s.name_ar })),
    [sections],
  );
  const brandOptions = useMemo(
    () => (brands ?? []).map((b) => ({ id: b.id, name: b.name })),
    [brands],
  );

  function getCategoryDisplayName(categoryId: string | null | undefined): string {
    if (!categoryId) return '—';
    return categories?.find((c) => c.id === categoryId)?.name_ar ?? '—';
  }

  const searched = useMemo(() => {
    const all = data?.data ?? [];
    const q = search.trim().toLowerCase();
    return q ? all.filter((p) => getProductName(p, locale).toLowerCase().includes(q)) : all;
  }, [data, search, locale]);

  const missingCounts = useMemo(() => {
    const counts: Record<MissingFilter, number> = { section: 0, weight: 0, price: 0, erp_code: 0 };
    for (const p of searched) {
      for (const opt of MISSING_FILTER_OPTIONS) {
        if (isMissingField(p, opt.id)) counts[opt.id]++;
      }
    }
    return counts;
  }, [searched]);

  const afterMissing = useMemo(() => {
    if (activeMissingFilters.size === 0) return searched;
    return searched.filter((p) => Array.from(activeMissingFilters).some((f) => isMissingField(p, f)));
  }, [searched, activeMissingFilters]);

  // Column order must match ProductRow's cells.
  const columns = useMemo<ReportColumn[]>(() => {
    const num = (v: number | null | undefined, suffix = '') => (v != null ? `${v}${suffix}` : EMPTY_VALUE);
    const nameOf = (list: { id: string; name: string }[], id: string | null | undefined) =>
      (id && list.find((o) => o.id === id)?.name) || EMPTY_VALUE;
    return [
      { key: 'name',     label: 'اسم الصنف',       flex: 3, value: (p) => getProductName(p, locale) },
      { key: 'erp',      label: 'كود ERP',         flex: 2, value: (p) => p.erp_code || EMPTY_VALUE },
      { key: 'category', label: 'الفئة',           flex: 2, value: (p) => nameOf(categoryOptions, p.category_id) },
      { key: 'section',  label: 'القسم',           flex: 2, value: (p) => nameOf(sectionOptions, p.section_id) },
      { key: 'brand',    label: 'الماركة',         flex: 2, value: (p) => nameOf(brandOptions, p.brand_id) },
      { key: 'unit',     label: 'الوحدة الافتراضية', flex: 2, value: (p) => nameOf(UNIT_TYPE_OPTIONS, getProductUnits(p)[0]?.unit) },
      { key: 'minQty',   label: 'أدنى كمية للبيع', flex: 2, value: (p) => num(p.min_order_quantity) },
      { key: 'price',    label: 'سعر المنتج',      flex: 2, value: (p) => num(p.price) },
      { key: 'piece',    label: 'سعر الحبة',       flex: 2, value: (p) => num(p.price_per_piece) },
      { key: 'kg',       label: 'سعر الكيلو',      flex: 2, value: (p) => num(p.price_per_kg) },
      { key: 'carton',   label: 'السعر بالكرتونة', flex: 2, value: (p) => num(p.price_per_carton) },
      { key: 'pieces',   label: 'التعبئة/كرتون',   flex: 2, value: (p) => num(p.pieces_per_carton) },
      { key: 'weight',   label: 'الوزن',           flex: 2, value: (p) => num(p.weight, p.weight != null ? ` ${p.weight_unit ?? 'kg'}` : '') },
    ];
  }, [locale, categoryOptions, sectionOptions, brandOptions]);

  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});
  const [filterColumn, setFilterColumn] = useState<ReportColumn | null>(null);
  const activeColumnFilters = Object.entries(columnFilters).filter(([, set]) => set.size > 0);

  function matchesColumnFilters(p: any, skipKey?: string) {
    return activeColumnFilters.every(([key, set]) => {
      if (key === skipKey) return true;
      const col = columns.find((c) => c.key === key);
      return !col || set.has(col.value(p));
    });
  }

  const products = useMemo(
    () => afterMissing.filter((p) => matchesColumnFilters(p)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [afterMissing, columnFilters, columns],
  );

  // Options for the open filter: values left after every *other* filter, like Excel.
  const filterOptions = useMemo(() => {
    if (!filterColumn) return [];
    const counts = new Map<string, number>();
    for (const p of afterMissing) {
      if (!matchesColumnFilters(p, filterColumn.key)) continue;
      const v = filterColumn.value(p);
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const isNum = (v: string) => v !== EMPTY_VALUE && !isNaN(parseFloat(v));
    return Array.from(counts, ([value, count]) => ({ value, count })).sort((a, b) => {
      if (a.value === EMPTY_VALUE) return -1;
      if (b.value === EMPTY_VALUE) return 1;
      return isNum(a.value) && isNum(b.value) ? parseFloat(a.value) - parseFloat(b.value) : a.value.localeCompare(b.value, 'ar');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterColumn, afterMissing, columnFilters]);

  const grouped = useMemo(() => {
    return products.reduce<Record<string, any[]>>((acc, p) => {
      const key = p.brand_id ?? 'no-brand';
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    }, {});
  }, [products]);

  function getBrandName(brandId: string): string {
    if (brandId === 'no-brand') return 'أخرى';
    return brands?.find((b) => b.id === brandId)?.name ?? brandId;
  }

  function toggleCollapse(id: string) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const excelRows = useMemo(() =>
    products.map((p) => ({
      'البراند':              getBrandName(p.brand_id ?? 'no-brand'),
      'الفئة':                getCategoryDisplayName(p.category_id),
      'القسم':                sections?.find((x) => x.id === p.section_id)?.name_ar ?? '—',
      'الوحدة الافتراضية':   UNIT_TYPE_OPTIONS.find((o) => o.id === getProductUnits(p)[0]?.unit)?.name ?? '—',
      'أدنى كمية للبيع':     p.min_order_quantity ?? 1,
      'اسم الصنف':           getProductName(p, locale),
      'كود ERP':             p.erp_code ?? '—',
      'سعر المنتج':          p.price ?? '—',
      'سعر الحبة':           p.price_per_piece ?? '—',
      'سعر الكيلو':          p.price_per_kg ?? '—',
      'السعر بالكرتونة':     p.price_per_carton ?? '—',
      'التعبئة في الكرتون':  p.pieces_per_carton ?? '—',
      'الوزن':               p.weight != null ? `${p.weight} ${p.weight_unit ?? 'kg'}` : '—',
    })),
    [products, locale, brands, categories, sections],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, direction: 'rtl' as any }} edges={['top']}>
      {filterColumn && (
        <ColumnFilterModal
          column={filterColumn}
          options={filterOptions}
          selected={columnFilters[filterColumn.key] ?? new Set()}
          onClose={() => setFilterColumn(null)}
          onApply={(next) => {
            setColumnFilters((prev) => ({ ...prev, [filterColumn.key]: next }));
            setFilterColumn(null);
          }}
        />
      )}
      <AdminHeader
        title="تقرير المنتجات"
        subtitle={isLoading ? 'جاري التحميل...' : `${products.length} صنف · ${Object.keys(grouped).length} ماركة`}
        actions={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <AdminButton icon="cloud-upload-outline" label="استيراد ERP" onPress={() => router.push('/(admin)/products/import-stock' as any)} />
            {Platform.OS === 'web' && (
              <AdminButton primary icon="download-outline" label="تصدير Excel" onPress={() => exportToExcel(excelRows)} />
            )}
          </View>
        }
      >
        <AdminSearch value={search} onChangeText={setSearch} placeholder="بحث عن صنف" />
        {/* Missing-data filters */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          {MISSING_FILTER_OPTIONS.map((opt) => (
            <AdminChip
              key={opt.id}
              label={opt.label}
              count={missingCounts[opt.id]}
              active={activeMissingFilters.has(opt.id)}
              onPress={() => toggleMissingFilter(opt.id)}
            />
          ))}
          {(activeMissingFilters.size > 0 || activeColumnFilters.length > 0) && (
            <TouchableOpacity
              onPress={() => { setActiveMissingFilters(new Set()); setColumnFilters({}); }}
              style={{ paddingHorizontal: 6, paddingVertical: 6 }}
            >
              <Text style={{ fontSize: 12, color: C.muted, textDecorationLine: 'underline' }}>
                مسح الفلاتر{activeColumnFilters.length ? ` (${activeColumnFilters.map(([k]) => columns.find((c) => c.key === k)?.label).join('، ')})` : ''}
              </Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => setCollapsed({})} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.line }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: C.text }}>فتح الكل</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                const all: Record<string, boolean> = {};
                Object.keys(grouped).forEach((id) => { all[id] = true; });
                setCollapsed(all);
              }}
              style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.line }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: C.text }}>طي الكل</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AdminHeader>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.brand} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
          <View style={{ flex: 1, minWidth: TABLE_MIN_WIDTH }}>
          {/* Table column header */}
          <View style={{
            flexDirection: 'row', backgroundColor: '#fff',
            paddingHorizontal: 12, paddingVertical: 10,
            borderBottomWidth: 1, borderBottomColor: C.line,
          }}>
            {columns.map((col) => {
              const active = (columnFilters[col.key]?.size ?? 0) > 0;
              return (
                <TouchableOpacity
                  key={col.key}
                  onPress={() => setFilterColumn(col)}
                  accessibilityLabel={`تصفية ${col.label}`}
                  style={{ flex: col.flex, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 }}
                >
                  <Text style={[styles.hCell, { flexShrink: 1, paddingHorizontal: 0, color: active ? C.brand : COLORS.muted }]} numberOfLines={2}>{col.label}</Text>
                  <Ionicons name={active ? 'funnel' : 'funnel-outline'} size={12} color={active ? C.brand : COLORS.faint} />
                </TouchableOpacity>
              );
            })}
          </View>

          {Object.entries(grouped).map(([brandId, items]) => (
            <View key={brandId}>
              <BrandHeader
                name={getBrandName(brandId)}
                count={items.length}
                collapsed={!!collapsed[brandId]}
                onToggle={() => toggleCollapse(brandId)}
              />
              {!collapsed[brandId] && items.map((p, idx) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  locale={locale}
                  idx={idx}
                  categoryOptions={categoryOptions}
                  sectionOptions={sectionOptions}
                  brandOptions={brandOptions}
                />
              ))}
            </View>
          ))}

          {products.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 14, color: C.muted }}>لا توجد نتائج</Text>
            </View>
          )}
          </View>
          </ScrollView>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = {
  hCell: {
    minWidth: 0,
    paddingHorizontal: 4,
    fontSize: 12,
    fontWeight: '700' as const,
    color: COLORS.muted,
    textAlign: 'right' as const,
  },
};
