import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProductsPage, useUpdateProduct } from '@/hooks/useProducts';
import { useBrands } from '@/hooks/useBrands';
import { useCategories } from '@/hooks/useCategories';
import { useSections } from '@/hooks/useSections';
import { getCurrentLocale, SupportedLocale } from '@/i18n';
import { getProductName } from '@/types/models';
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
      <EditableSelectCell
        value={product.unit_type ?? null}
        options={UNIT_TYPE_OPTIONS}
        onSave={(v) => save({ unit_type: v })}
        allowNone
        noneLabel="بدون نوع"
      />
      <EditableCell
        value={product.min_order_quantity}
        onSave={async (v) => {
          if (v == null || !Number.isInteger(v) || v < 1) {
            throw new Error('أدنى كمية للبيع يجب أن تكون رقمًا صحيحًا 1 أو أكثر');
          }
          await save({ min_order_quantity: v });
        }}
        numeric
      />
      <EditableCell
        value={product.price}
        onSave={(v) => save({ price: v })}
        suffix=" د.أ"
        numeric
      />
      <EditableCell
        value={product.price_per_piece}
        onSave={(v) => save(v != null ? { price_per_piece: v, price: v } : { price_per_piece: v })}
        suffix=" د.أ"
        numeric
      />
      <EditableCell
        value={product.price_per_kg}
        onSave={(v) => save(v != null ? { price_per_kg: v, price: v } : { price_per_kg: v })}
        suffix=" د.أ"
        numeric
      />
      <EditableCell
        value={product.price_per_carton}
        onSave={(v) => save(v != null ? { price_per_carton: v, price: v } : { price_per_carton: v })}
        suffix=" د.أ"
        numeric
      />
      <EditableCell
        value={product.pieces_per_carton}
        onSave={(v) => save({ pieces_per_carton: v })}
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

  const products = useMemo(() => {
    if (activeMissingFilters.size === 0) return searched;
    return searched.filter((p) => Array.from(activeMissingFilters).some((f) => isMissingField(p, f)));
  }, [searched, activeMissingFilters]);

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
      'نوع الوحدة':          UNIT_TYPE_OPTIONS.find((o) => o.id === p.unit_type)?.name ?? '—',
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
          {activeMissingFilters.size > 0 && (
            <TouchableOpacity onPress={() => setActiveMissingFilters(new Set())} style={{ paddingHorizontal: 6, paddingVertical: 6 }}>
              <Text style={{ fontSize: 12, color: C.muted, textDecorationLine: 'underline' }}>مسح الفلتر</Text>
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
            <Text style={[styles.hCell, { flex: 3 }]}>اسم الصنف</Text>
            <Text style={[styles.hCell, { flex: 2 }]}>كود ERP</Text>
            <Text style={[styles.hCell, { flex: 2 }]}>الفئة</Text>
            <Text style={[styles.hCell, { flex: 2 }]}>القسم</Text>
            <Text style={[styles.hCell, { flex: 2 }]}>الماركة</Text>
            <Text style={[styles.hCell, { flex: 2 }]}>نوع الوحدة</Text>
            <Text style={[styles.hCell, { flex: 2 }]}>أدنى كمية للبيع</Text>
            <Text style={[styles.hCell, { flex: 2 }]}>سعر المنتج</Text>
            <Text style={[styles.hCell, { flex: 2 }]}>سعر الحبة</Text>
            <Text style={[styles.hCell, { flex: 2 }]}>سعر الكيلو</Text>
            <Text style={[styles.hCell, { flex: 2 }]}>السعر بالكرتونة</Text>
            <Text style={[styles.hCell, { flex: 2 }]}>التعبئة/كرتون</Text>
            <Text style={[styles.hCell, { flex: 2 }]}>الوزن</Text>
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
