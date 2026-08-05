import { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProductsPage, useUpdateProduct } from '@/hooks/useProducts';
import { useBrands } from '@/hooks/useBrands';
import { getCurrentLocale } from '@/i18n';
import { getProductName } from '@/types/models';
import { useQueryClient } from '@tanstack/react-query';

const C = {
  bg:    '#f0f4f8',
  card:  '#ffffff',
  brand: '#e36523',
  text:  '#1e293b',
  muted: '#64748b',
  header:'#0d1b2a',
};

function exportToExcel(rows: any[]) {
  if (Platform.OS !== 'web') return;
  import('xlsx').then((XLSX) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 22 }, { wch: 40 }, { wch: 18 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'تقرير المنتجات');
    XLSX.writeFile(wb, 'products-report.xlsx');
  });
}

// ─── Inline-editable cell ─────────────────────────────────────────────────────
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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft(value != null ? String(value) : '');
    setEditing(true);
  }

  async function commit() {
    const parsed = draft.trim() === '' ? null : parseFloat(draft.replace(',', '.'));
    if (parsed !== null && isNaN(parsed)) {
      Alert.alert('خطأ', 'يرجى إدخال رقم صحيح');
      return;
    }
    setSaving(true);
    try {
      await onSave(parsed);
    } catch (e: any) {
      Alert.alert('خطأ', e?.message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  if (saving) {
    return (
      <View style={{ flex: 2, alignItems: 'flex-end', paddingHorizontal: 4 }}>
        <ActivityIndicator size="small" color={C.brand} />
      </View>
    );
  }

  if (editing) {
    return (
      <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          keyboardType={numeric ? 'decimal-pad' : 'numeric'}
          autoFocus
          style={{
            flex: 1, borderWidth: 1.5, borderColor: C.brand, borderRadius: 6,
            paddingHorizontal: 6, paddingVertical: 4, fontSize: 12,
            color: C.text, textAlign: 'right', backgroundColor: '#fff',
          }}
          onSubmitEditing={commit}
        />
        <TouchableOpacity onPress={commit} style={{ backgroundColor: '#16a34a', borderRadius: 6, padding: 4 }}>
          <Ionicons name="checkmark" size={14} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setEditing(false)} style={{ backgroundColor: '#ef4444', borderRadius: 6, padding: 4 }}>
          <Ionicons name="close" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity style={{ flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }} onPress={startEdit}>
      <Text style={{ fontSize: 13, color: value != null ? C.brand : C.muted, fontWeight: value != null ? '700' : '400', textAlign: 'right' }}>
        {value != null ? `${value}${suffix ?? ''}` : '—'}
      </Text>
      <Ionicons name="pencil-outline" size={12} color={C.muted} />
    </TouchableOpacity>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────
function ProductRow({ product, locale, idx }: { product: any; locale: string; idx: number }) {
  const queryClient = useQueryClient();
  const update = useUpdateProduct(product.id);

  const save = useCallback(async (field: string, value: number | null) => {
    await update.mutateAsync({ [field]: value });
    queryClient.invalidateQueries({ queryKey: ['products'] });
  }, [update, queryClient]);

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: idx % 2 === 0 ? C.card : '#f8fafc',
      paddingHorizontal: 12, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    }}>
      <Text style={{ flex: 3, fontSize: 13, fontWeight: '600', color: C.text, textAlign: 'right' }} numberOfLines={2}>
        {getProductName(product, locale)}
      </Text>
      <EditableCell
        value={product.price_per_carton}
        onSave={(v) => save('price_per_carton', v)}
        suffix=" د.أ"
        numeric
      />
      <EditableCell
        value={product.pieces_per_carton}
        onSave={(v) => save('pieces_per_carton', v)}
        suffix=" قطعة"
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
        marginHorizontal: 0, marginTop: 12, marginBottom: 0,
        paddingHorizontal: 14, paddingVertical: 10,
        backgroundColor: '#1e293b',
        borderRightWidth: 4, borderRightColor: C.brand,
      }}
    >
      <Ionicons
        name={collapsed ? 'chevron-back' : 'chevron-down'}
        size={14}
        color="#94a3b8"
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#e3652322', borderRadius: 20 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.brand }}>{count}</Text>
        </View>
        <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff', textAlign: 'right' }}>{name}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ProductsReportScreen() {
  const router = useRouter();
  const locale = getCurrentLocale();
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useProductsPage({ availableOnly: false, page: 0, limit: 9999 });
  const { data: brands } = useBrands(false);

  const products = useMemo(() => {
    const all = data?.data ?? [];
    const q = search.trim().toLowerCase();
    return q ? all.filter((p) => getProductName(p, locale).toLowerCase().includes(q)) : all;
  }, [data, search, locale]);

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
      'اسم الصنف':           getProductName(p, locale),
      'السعر بالكرتونة':     p.price_per_carton ?? '—',
      'التعبئة في الكرتون':  p.pieces_per_carton ?? '—',
    })),
    [products, locale, brands],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      {/* Header */}
      <View style={{ backgroundColor: C.header, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' }}>تقرير المنتجات</Text>
        {Platform.OS === 'web' && (
          <TouchableOpacity
            onPress={() => exportToExcel(excelRows)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#16a34a', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 }}
          >
            <Ionicons name="download-outline" size={16} color="#fff" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>تصدير Excel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search + controls */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 12, gap: 8 }}>
          <Ionicons name="search-outline" size={16} color={C.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="بحث عن صنف..."
            placeholderTextColor={C.muted}
            style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: C.text, textAlign: 'right' }}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => setCollapsed({})} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#f1f5f9' }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: C.muted }}>فتح الكل</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                const all: Record<string, boolean> = {};
                Object.keys(grouped).forEach((id) => { all[id] = true; });
                setCollapsed(all);
              }}
              style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#f1f5f9' }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: C.muted }}>طي الكل</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 12, color: C.muted }}>
            {isLoading ? 'جاري التحميل...' : `${products.length} صنف — ${Object.keys(grouped).length} براند`}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.brand} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Table column header */}
          <View style={{
            flexDirection: 'row', backgroundColor: C.header,
            paddingHorizontal: 12, paddingVertical: 8,
          }}>
            <Text style={[styles.hCell, { flex: 3 }]}>اسم الصنف</Text>
            <Text style={[styles.hCell, { flex: 2 }]}>السعر بالكرتونة</Text>
            <Text style={[styles.hCell, { flex: 2 }]}>التعبئة/كرتون</Text>
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
                <ProductRow key={p.id} product={p} locale={locale} idx={idx} />
              ))}
            </View>
          ))}

          {products.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 14, color: C.muted }}>لا توجد نتائج</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = {
  hCell: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'right' as const,
  },
};
