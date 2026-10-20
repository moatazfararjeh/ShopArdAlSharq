import { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, TextInput } from 'react-native';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Image } from 'expo-image';
import { Skeleton } from '@/components/ui/Skeleton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useProductsPage, useDeleteProduct } from '@/hooks/useProducts';
import { useSections } from '@/hooks/useSections';
import { getCurrentLocale, SupportedLocale } from '@/i18n';
import { getProductName } from '@/types/models';
import { formatPrice } from '@/utils/formatPrice';
import { Product } from '@/types/models';
import { COLORS } from '@/lib/theme';

// ─── Filters ──────────────────────────────────────────────────────────────────
// Keys match the dashboard's "صحة الكتالوج" links (?filter=out etc.).
type FilterKey = 'all' | 'out' | 'noimage' | 'nosection' | 'nobrand' | 'hidden';

const FILTERS: Array<{ key: FilterKey; label: string; test: (p: Product) => boolean }> = [
  { key: 'all',       label: 'الكل',        test: () => true },
  { key: 'out',       label: 'نفدت الكمية', test: (p) => p.is_available && p.stock_quantity === 0 },
  { key: 'noimage',   label: 'بدون صورة',   test: (p) => !(p.product_images?.length) },
  { key: 'nosection', label: 'بدون قسم',    test: (p) => !p.section_id },
  { key: 'nobrand',   label: 'بدون ماركة',  test: (p) => !p.brand_id },
  { key: 'hidden',    label: 'مخفي',        test: (p) => !p.is_available },
];

const UNIT_LABELS: Record<string, string> = { kg: 'كغ', carton: 'كرتون', piece: 'حبة', tin: 'تنك' };

// ─── Product row ──────────────────────────────────────────────────────────────
function ProductRow({
  item, locale, sectionName, onEdit, onDelete, onAnalytics,
}: {
  item: Product;
  locale: SupportedLocale;
  sectionName?: string;
  onEdit: () => void;
  onDelete: () => void;
  onAnalytics: () => void;
}) {
  const thumbUrl = item.product_images?.[0]?.url ?? null;
  const unit = item.unit_type ? UNIT_LABELS[item.unit_type] : '';
  const meta = [item.categories?.name_ar, sectionName, item.brands?.name].filter(Boolean).join(' · ');

  let stock: { label: string; color: string; bg: string };
  if (!item.is_available) stock = { label: 'مخفي', color: COLORS.muted, bg: COLORS.surface };
  else if (item.stock_quantity === 0) stock = { label: 'نفدت', color: COLORS.danger, bg: '#FDECEA' };
  else stock = { label: `${item.stock_quantity}${unit ? ' ' + unit : ''}`, color: COLORS.green, bg: COLORS.greenTint };

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      marginHorizontal: 16, marginVertical: 4, backgroundColor: '#fff', padding: 12, borderRadius: 16,
    }}>
      <TouchableOpacity onPress={onEdit} activeOpacity={0.8} accessibilityLabel="تعديل المنتج">
        {thumbUrl ? (
          <Image
            source={{ uri: thumbUrl }}
            accessibilityLabel={getProductName(item, locale)}
            style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: COLORS.surface }}
            contentFit="cover"
          />
        ) : (
          <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: COLORS.brandTint, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="image-outline" size={22} color={COLORS.brandText} />
          </View>
        )}
      </TouchableOpacity>

      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.ink }} numberOfLines={1}>
          {getProductName(item, locale)}
        </Text>
        <Text style={{ fontSize: 12, color: meta ? COLORS.muted : COLORS.faint }} numberOfLines={1}>
          {meta || 'بدون تصنيف'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.ink }}>{formatPrice(item.price)}</Text>
          <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: stock.bg }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: stock.color }}>{stock.label}</Text>
          </View>
          {!!item.erp_code && <Text style={{ fontSize: 11, color: COLORS.faint }} numberOfLines={1}>#{item.erp_code}</Text>}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        {[
          { icon: 'bar-chart-outline' as const, label: 'إحصاءات المنتج', onPress: onAnalytics, color: COLORS.muted },
          { icon: 'create-outline' as const, label: 'تعديل', onPress: onEdit, color: COLORS.ink },
          { icon: 'trash-outline' as const, label: 'حذف', onPress: onDelete, color: COLORS.danger },
        ].map((a) => (
          <TouchableOpacity
            key={a.icon}
            onPress={a.onPress}
            accessibilityLabel={a.label}
            style={{ width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name={a.icon} size={18} color={a.color} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AdminProductsScreen() {
  const { confirm, dialog } = useConfirm();
  const { t } = useTranslation();
  const router = useRouter();
  const locale = getCurrentLocale();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');

  // Follow the dashboard's ?filter= link, including when it changes while mounted.
  useEffect(() => {
    if (params.filter && FILTERS.some((f) => f.key === params.filter)) setFilter(params.filter as FilterKey);
  }, [params.filter]);

  const { data, isLoading } = useProductsPage({ availableOnly: false, page: 0, limit: 9999 });
  const { data: sections } = useSections(false);
  const deleteMutation = useDeleteProduct();

  const products: Product[] = data?.data ?? [];
  const sectionNames = useMemo(
    () => Object.fromEntries((sections ?? []).map((s) => [s.id, s.name_ar])) as Record<string, string>,
    [sections],
  );

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, products.filter(f.test).length])) as Record<FilterKey, number>,
    [products],
  );

  const visible = useMemo(() => {
    const test = FILTERS.find((f) => f.key === filter)!.test;
    const q = query.trim().toLowerCase();
    return products.filter((p) => test(p) && (!q || [
      p.name_ar, p.name_en, p.erp_code, p.brands?.name, p.categories?.name_ar, p.section_id ? sectionNames[p.section_id] : '',
    ].some((v) => (v ?? '').toLowerCase().includes(q))));
  }, [products, filter, query, sectionNames]);

  async function confirmDelete(id: string, name: string) {
    const ok = await confirm({
      title: t('admin.confirmDelete'),
      message: name,
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      destructive: true,
    });
    if (ok) deleteMutation.mutate(id);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface, direction: 'rtl' as any }}>
      {/* Header */}
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.line }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard')}
            accessibilityLabel="رجوع"
            style={{ width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="arrow-forward" size={20} color={COLORS.ink} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 19, fontWeight: '700', color: COLORS.ink }}>{t('admin.manageProducts')}</Text>
            <Text style={{ fontSize: 12, color: COLORS.muted }}>{visible.length} من {products.length} منتج</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(admin)/products/excel' as any)}
            accessibilityLabel="المنتجات عبر Excel"
            style={{ height: 40, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
          >
            <Ionicons name="document-attach-outline" size={18} color={COLORS.ink} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.ink }}>Excel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(admin)/products/add')}
            style={{ height: 40, paddingHorizontal: 14, borderRadius: 10, backgroundColor: COLORS.brandFill, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 }}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>منتج جديد</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 44, borderRadius: 12, backgroundColor: COLORS.surface, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 }}>
          <Ionicons name="search-outline" size={18} color={COLORS.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="اسم المنتج، الرمز، الفئة، القسم أو الماركة"
            placeholderTextColor={COLORS.muted}
            style={{ flex: 1, fontSize: 14, color: COLORS.ink, textAlign: 'right' } as any}
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="مسح البحث">
              <Ionicons name="close-circle" size={18} color={COLORS.faint} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: 'row' }}>
          {FILTERS.map((f) => {
            const isActive = filter === f.key;
            const count = counts[f.key] ?? 0;
            if (count === 0 && f.key !== 'all' && !isActive) return null;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.8}
                accessibilityState={{ selected: isActive }}
                style={{
                  height: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 18,
                  backgroundColor: isActive ? COLORS.ink : '#fff', borderWidth: 1, borderColor: isActive ? COLORS.ink : COLORS.line,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: isActive ? '700' : '500', color: isActive ? '#fff' : COLORS.ink }}>{f.label}</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: isActive ? '#fff' : COLORS.muted }}>{count}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={isLoading ? [] : visible}
        keyExtractor={(item) => item.id}
        initialNumToRender={20}
        windowSize={10}
        contentContainerStyle={{ paddingVertical: 10, paddingBottom: 80 }}
        renderItem={({ item }) => (
          <ProductRow
            item={item}
            locale={locale}
            sectionName={item.section_id ? sectionNames[item.section_id] : undefined}
            onAnalytics={() => router.push(`/(admin)/products/${item.id}/analytics` as any)}
            onEdit={() => router.push(`/(admin)/products/${item.id}/edit` as any)}
            onDelete={() => confirmDelete(item.id, getProductName(item, locale))}
          />
        )}
        ListHeaderComponent={
          isLoading ? (
            <View style={{ paddingHorizontal: 16, gap: 8 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Skeleton width={56} height={56} borderRadius={12} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <Skeleton width="60%" height={13} borderRadius={5} />
                    <Skeleton width="40%" height={11} borderRadius={5} />
                    <Skeleton width="25%" height={11} borderRadius={5} />
                  </View>
                </View>
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={{ paddingTop: 80, alignItems: 'center', gap: 10 }}>
              <Ionicons name="cube-outline" size={48} color={COLORS.faint} />
              <Text style={{ color: COLORS.muted, fontSize: 15, fontWeight: '600' }}>
                {query || filter !== 'all' ? 'لا توجد منتجات مطابقة' : t('products.noProducts')}
              </Text>
            </View>
          ) : null
        }
      />
      {dialog}
    </SafeAreaView>
  );
}
