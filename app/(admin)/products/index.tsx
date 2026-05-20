import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useProductsPage, useDeleteProduct } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { getCurrentLocale } from '@/i18n';
import { getProductName } from '@/types/models';
import { formatPrice } from '@/utils/formatPrice';
import { Product } from '@/types/models';
import { Button } from '@/components/ui/Button';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

export default function AdminProductsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = getCurrentLocale();
  const [page, setPage] = useState(0);

  const { data, isLoading, isFetching } = useProductsPage({ availableOnly: false, page, limit: DEFAULT_PAGE_SIZE, groupByCategory: true });
  const { data: categories } = useCategories(false);
  const deleteMutation = useDeleteProduct();

  const products: Product[] = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / DEFAULT_PAGE_SIZE);
  const hasNext = page < totalPages - 1;
  const hasPrev = page > 0;

  // Group products by category
  const grouped = products.reduce<Record<string, Product[]>>((acc, product) => {
    const catId = product.category_id ?? 'uncategorized';
    if (!acc[catId]) acc[catId] = [];
    acc[catId].push(product);
    return acc;
  }, {});

  function getCategoryName(catId: string): string {
    if (catId === 'uncategorized') return locale === 'ar' ? 'بدون تصنيف' : 'Uncategorized';
    const cat = categories?.find((c) => c.id === catId);
    if (!cat) return catId;
    return locale === 'ar' ? cat.name_ar : (cat.name_en ?? cat.name_ar);
  }

  function confirmDelete(id: string, name: string) {
    if (Platform.OS === 'web') {
      if (window.confirm(`${t('admin.confirmDelete')}\n${name}`)) {
        deleteMutation.mutate(id);
      }
      return;
    }
    Alert.alert(t('admin.confirmDelete'), name, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
        <Button
          title={t('admin.addProduct')}
          size="sm"
          onPress={() => router.push('/(admin)/products/add')}
        />
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>{t('admin.manageProducts')}</Text>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard')} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18, color: '#374151' }}>›</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#e36523" />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
          {Object.entries(grouped).map(([catId, items]) => (
            <View key={catId} style={{ marginTop: 16 }}>
              {/* Category header */}
              <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f3f0ec', marginHorizontal: 12, borderRadius: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#5c4a35' }}>
                  {getCategoryName(catId)} ({items.length})
                </Text>
              </View>

              {/* Products in this category */}
              {items.map((item) => (
                <View key={item.id} style={{ marginHorizontal: 16, marginVertical: 4, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: '#111827' }} numberOfLines={1}>
                      {getProductName(item, locale)}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#e36523', marginTop: 2 }}>{formatPrice(item.price)}</Text>
                    <Text style={{ fontSize: 11, color: item.is_available ? '#22c55e' : '#ef4444', marginTop: 2 }}>
                      {item.is_available ? 'متوفر' : 'غير متوفر'} • المخزون: {item.stock_quantity}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => router.push(`/(admin)/products/${item.id}/edit`)}
                      style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                    >
                      <Text style={{ fontSize: 13 }}>{t('common.edit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => confirmDelete(item.id, getProductName(item, locale))}
                      style={{ backgroundColor: '#fef2f2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                    >
                      <Text style={{ fontSize: 13, color: '#ef4444' }}>{t('common.delete')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))}

          {products.length === 0 && (
            <View style={{ marginTop: 80, alignItems: 'center' }}>
              <Text style={{ color: '#9ca3af' }}>{t('products.noProducts')}</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Pagination footer */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
        <TouchableOpacity
          disabled={!hasPrev || isFetching}
          onPress={() => setPage((p) => p - 1)}
          style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: hasPrev ? '#e36523' : '#e5e7eb' }}
        >
          <Text style={{ color: hasPrev ? '#fff' : '#9ca3af', fontWeight: '600', fontSize: 13 }}>→ السابق</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {isFetching && <ActivityIndicator size="small" color="#e36523" />}
          <Text style={{ fontSize: 13, color: '#6b7280' }}>
            صفحة {page + 1} من {totalPages || 1}
          </Text>
        </View>

        <TouchableOpacity
          disabled={!hasNext || isFetching}
          onPress={() => setPage((p) => p + 1)}
          style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: hasNext ? '#e36523' : '#e5e7eb' }}
        >
          <Text style={{ color: hasNext ? '#fff' : '#9ca3af', fontWeight: '600', fontSize: 13 }}>التالي ←</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

