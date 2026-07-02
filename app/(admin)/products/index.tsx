import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useProductsPage, useDeleteProduct } from '@/hooks/useProducts';
import { useBrands } from '@/hooks/useBrands';
import { getCurrentLocale } from '@/i18n';
import { getProductName } from '@/types/models';
import { formatPrice } from '@/utils/formatPrice';
import { Product } from '@/types/models';
import { Button } from '@/components/ui/Button';

export default function AdminProductsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = getCurrentLocale();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggleCollapse(brandId: string) {
    setCollapsed((prev) => ({ ...prev, [brandId]: !prev[brandId] }));
  }

  const { data, isLoading } = useProductsPage({ availableOnly: false, page: 0, limit: 9999 });
  const { data: brands } = useBrands(false);
  const deleteMutation = useDeleteProduct();

  const products: Product[] = data?.data ?? [];

  // Group products by brand
  const grouped = products.reduce<Record<string, Product[]>>((acc, product) => {
    const brandId = product.brand_id ?? 'no-brand';
    if (!acc[brandId]) acc[brandId] = [];
    acc[brandId].push(product);
    return acc;
  }, {});

  function getBrandName(brandId: string): string {
    if (brandId === 'no-brand') return 'أخرى';
    const brand = brands?.find((b) => b.id === brandId);
    if (!brand) return brandId;
    return brand.name;
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

      {/* Collapse All / Expand All */}
      {!isLoading && Object.keys(grouped).length > 0 && (
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
          <TouchableOpacity
            onPress={() => {
              const allCollapsed: Record<string, boolean> = {};
              Object.keys(grouped).forEach((id) => { allCollapsed[id] = true; });
              setCollapsed(allCollapsed);
            }}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f3f4f6' }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>طي الكل ＋</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setCollapsed({})}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f3f4f6' }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>فتح الكل －</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width="65%" height={13} borderRadius={5} />
                <Skeleton width="40%" height={11} borderRadius={5} />
                <Skeleton width="30%" height={11} borderRadius={5} />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Skeleton width={52} height={30} borderRadius={8} />
                <Skeleton width={52} height={30} borderRadius={8} />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
          {Object.entries(grouped).map(([brandId, items]) => (
            <View key={brandId} style={{ marginTop: 16 }}>
              {/* Brand header */}
              <TouchableOpacity
                onPress={() => toggleCollapse(brandId)}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#f3f0ec', marginHorizontal: 12, borderRadius: 10 }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#5c4a35' }}>
                  {getBrandName(brandId)} ({items.length})
                </Text>
                <Text style={{ fontSize: 16, color: '#5c4a35', fontWeight: '700' }}>
                  {collapsed[brandId] ? '＋' : '－'}
                </Text>
              </TouchableOpacity>

              {/* Products in this brand */}
              {!collapsed[brandId] && items.map((item) => (
                <View key={item.id} style={{ marginHorizontal: 16, marginVertical: 4, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: '#111827' }} numberOfLines={1}>
                      {getProductName(item, locale)}
                    </Text>
                    {item.brands?.name && (
                      <Text style={{ fontSize: 11, color: '#857d78', marginTop: 2 }}>الماركة: {item.brands.name}</Text>
                    )}
                    <Text style={{ fontSize: 13, color: '#e36523', marginTop: 2 }}>{formatPrice(item.price)}</Text>
                    <Text style={{ fontSize: 11, color: item.is_available ? '#22c55e' : '#ef4444', marginTop: 2 }}>
                      {item.is_available ? 'متوفر' : 'غير متوفر'} • المخزون: {item.stock_quantity}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      {(item.product_images?.length ?? 0) > 0 ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f0fdf4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontSize: 10 }}>🖼️</Text>
                          <Text style={{ fontSize: 10, color: '#16a34a', fontWeight: '600' }}>
                            {item.product_images!.length} {item.product_images!.length === 1 ? 'صورة' : 'صور'}
                          </Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fef2f2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontSize: 10 }}>⚠️</Text>
                          <Text style={{ fontSize: 10, color: '#dc2626', fontWeight: '600' }}>بدون صورة</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => router.push(`/(admin)/products/${item.id}/edit` as any)}
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
    </SafeAreaView>
  );
}

