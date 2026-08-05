import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProductsPage } from '@/hooks/useProducts';
import { formatPrice } from '@/utils/formatPrice';
import { getCurrentLocale } from '@/i18n';
import { getProductName } from '@/types/models';

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
    // Column widths
    ws['!cols'] = [{ wch: 40 }, { wch: 18 }, { wch: 20 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'تقرير المنتجات');
    XLSX.writeFile(wb, 'products-report.xlsx');
  });
}

export default function ProductsReportScreen() {
  const router = useRouter();
  const locale = getCurrentLocale();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useProductsPage({ availableOnly: false, page: 0, limit: 9999 });

  const products = useMemo(() => {
    const all = data?.data ?? [];
    const q = search.trim().toLowerCase();
    return q
      ? all.filter((p) => getProductName(p, locale).toLowerCase().includes(q))
      : all;
  }, [data, search, locale]);

  const excelRows = useMemo(() =>
    products.map((p) => ({
      'اسم الصنف':         getProductName(p, locale),
      'السعر الأساسي':     p.price,
      'السعر بالكرتونة':   p.price_per_carton ?? '—',
      'التعبئة في الكرتون': p.pieces_per_carton ?? '—',
    })),
    [products, locale],
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

      {/* Search */}
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
        <Text style={{ fontSize: 12, color: C.muted, marginTop: 6, textAlign: 'right' }}>
          {isLoading ? 'جاري التحميل...' : `${products.length} صنف`}
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.brand} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Table header */}
          <View style={{
            flexDirection: 'row', backgroundColor: C.header,
            borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4,
          }}>
            <Text style={[styles.hCell, { flex: 3 }]}>اسم الصنف</Text>
            <Text style={[styles.hCell, { flex: 2 }]}>السعر بالكرتونة</Text>
            <Text style={[styles.hCell, { flex: 2 }]}>التعبئة/كرتون</Text>
          </View>

          {/* Table rows */}
          {products.map((p, idx) => (
            <View
              key={p.id}
              style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: idx % 2 === 0 ? C.card : '#f8fafc',
                paddingHorizontal: 12, paddingVertical: 10,
                borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
              }}
            >
              <Text style={[styles.cell, { flex: 3, fontWeight: '600' }]} numberOfLines={2}>
                {getProductName(p, locale)}
              </Text>
              <Text style={[styles.cell, { flex: 2, color: C.brand, fontWeight: '700' }]}>
                {p.price_per_carton ? formatPrice(p.price_per_carton) : '—'}
              </Text>
              <Text style={[styles.cell, { flex: 2 }]}>
                {p.pieces_per_carton ? `${p.pieces_per_carton} قطعة` : '—'}
              </Text>
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
  cell: {
    fontSize: 13,
    color: '#1e293b',
    textAlign: 'right' as const,
  },
};
