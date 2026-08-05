import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Skeleton } from '@/components/ui/Skeleton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useProductsPage, useDeleteProduct } from '@/hooks/useProducts';
import { useBrands } from '@/hooks/useBrands';
import { getCurrentLocale } from '@/i18n';
import { getProductName } from '@/types/models';
import { formatPrice } from '@/utils/formatPrice';
import { Product } from '@/types/models';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  surface:  '#f0f4f8',
  card:     '#ffffff',
  brand:    '#e36523',
  text:     '#1e293b',
  muted:    '#64748b',
  hairline: '#e2e8f0',
};

// ─── Thumbnail ────────────────────────────────────────────────────────────────
function ProductThumb({ url }: { url: string | null }) {
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: '#f1f5f9' }}
        contentFit="cover"
      />
    );
  }
  return (
    <View style={{
      width: 52, height: 52, borderRadius: 12,
      backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
    }}>
      <Ionicons name="image-outline" size={22} color="#94a3b8" />
    </View>
  );
}

// ─── Product row ──────────────────────────────────────────────────────────────
function ProductRow({
  item,
  locale,
  onEdit,
  onDelete,
  onAnalytics,
}: {
  item: Product;
  locale: string;
  onEdit: () => void;
  onDelete: () => void;
  onAnalytics: () => void;
}) {
  const thumbUrl = item.product_images?.[0]?.url ?? null;
  const inStock = item.is_available && item.stock_quantity > 0;
  const unitLabel = item.unit_type === 'kg' ? 'كغ' : item.unit_type === 'carton' ? 'كرتون' : item.unit_type === 'piece' ? 'قطعة' : '';

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      marginHorizontal: 16, marginVertical: 4,
      backgroundColor: C.card, padding: 12, borderRadius: 16,
      shadowColor: '#1e293b', shadowOpacity: 0.05,
      shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    }}>
      <ProductThumb url={thumbUrl} />

      {/* Info block */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }} numberOfLines={1}>
          {getProductName(item, locale)}
        </Text>
        <Text style={{ fontSize: 12, fontWeight: '800', color: C.brand, marginTop: 2 }}>
          {formatPrice(item.price)}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <View style={{
            paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20,
            backgroundColor: inStock ? '#f0fdf4' : '#fff1f2',
          }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: inStock ? '#16a34a' : '#ef4444' }}>
              {inStock ? `متوفر • ${item.stock_quantity}${unitLabel ? ' ' + unitLabel : ''}` : 'غير متوفر'}
            </Text>
          </View>
          {(item.product_images?.length ?? 0) === 0 && (
            <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, backgroundColor: '#fff7ed' }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#f59e0b' }}>بدون صورة</Text>
            </View>
          )}
        </View>
      </View>

      {/* Icon actions */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <TouchableOpacity
          onPress={onAnalytics}
          style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="bar-chart-outline" size={16} color="#8b5cf6" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onEdit}
          style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="create-outline" size={16} color="#3b82f6" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
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
        marginHorizontal: 16, marginTop: 16, marginBottom: 6,
        paddingHorizontal: 14, paddingVertical: 10,
        backgroundColor: C.card, borderRadius: 12,
        borderRightWidth: 3, borderRightColor: C.brand,
        shadowColor: '#1e293b', shadowOpacity: 0.04,
        shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: '800', color: C.text }}>{name}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons
          name={collapsed ? 'chevron-back' : 'chevron-down'}
          size={14}
          color={C.muted}
        />
        <View style={{
          paddingHorizontal: 8, paddingVertical: 2,
          backgroundColor: '#fff7ed', borderRadius: 20,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.brand }}>{count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
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

  const grouped = products.reduce<Record<string, Product[]>>((acc, product) => {
    const brandId = product.brand_id ?? 'no-brand';
    if (!acc[brandId]) acc[brandId] = [];
    acc[brandId].push(product);
    return acc;
  }, {});

  function getBrandName(brandId: string): string {
    if (brandId === 'no-brand') return 'أخرى';
    const brand = brands?.find((b) => b.id === brandId);
    return brand?.name ?? brandId;
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
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }}>
      {/* ── Header ───────────────────────────────────────────────── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: C.card,
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: C.hairline,
      }}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard')}
          style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="home-outline" size={18} color={C.muted} />
        </TouchableOpacity>

        <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>
          {t('admin.manageProducts')}
        </Text>

        <TouchableOpacity
          onPress={() => router.push('/(admin)/products/add')}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 5,
            backgroundColor: C.brand, borderRadius: 12,
            paddingHorizontal: 14, paddingVertical: 8,
          }}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>إضافة</Text>
        </TouchableOpacity>
      </View>

      {/* ── Collapse controls ─────────────────────────────────────── */}
      {!isLoading && Object.keys(grouped).length > 0 && (
        <View style={{
          flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10,
          backgroundColor: C.card,
          borderBottomWidth: 1, borderBottomColor: C.hairline,
        }}>
          <Text style={{ flex: 1, fontSize: 12, color: C.muted, textAlign: 'right' }}>
            {products.length} منتج في {Object.keys(grouped).length} ماركة
          </Text>
          <TouchableOpacity
            onPress={() => setCollapsed({})}
            style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#f1f5f9' }}
          >
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
      )}

      {/* ── Content ───────────────────────────────────────────────── */}
      {isLoading ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={{ backgroundColor: C.card, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Skeleton width={52} height={52} borderRadius={12} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width="60%" height={13} borderRadius={5} />
                <Skeleton width="35%" height={11} borderRadius={5} />
                <Skeleton width="25%" height={10} borderRadius={20} />
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Skeleton width={34} height={34} borderRadius={10} />
                <Skeleton width={34} height={34} borderRadius={10} />
                <Skeleton width={34} height={34} borderRadius={10} />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }}>
          {Object.entries(grouped).map(([brandId, items]) => (
            <View key={brandId}>
              <BrandHeader
                name={getBrandName(brandId)}
                count={items.length}
                collapsed={!!collapsed[brandId]}
                onToggle={() => toggleCollapse(brandId)}
              />
              {!collapsed[brandId] && items.map((item) => (
                <ProductRow
                  key={item.id}
                  item={item}
                  locale={locale}
                  onAnalytics={() => router.push(`/(admin)/products/${item.id}/analytics` as any)}
                  onEdit={() => router.push(`/(admin)/products/${item.id}/edit` as any)}
                  onDelete={() => confirmDelete(item.id, getProductName(item, locale))}
                />
              ))}
            </View>
          ))}

          {products.length === 0 && (
            <View style={{ marginTop: 80, alignItems: 'center', gap: 10 }}>
              <Ionicons name="cube-outline" size={48} color="#cbd5e1" />
              <Text style={{ color: C.muted, fontSize: 15, fontWeight: '600' }}>
                {t('products.noProducts')}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
