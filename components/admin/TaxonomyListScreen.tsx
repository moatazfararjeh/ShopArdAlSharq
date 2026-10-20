import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { useProductsPage } from '@/hooks/useProducts';
import { COLORS } from '@/lib/theme';
import { AdminHeader, AdminButton, AdminSearch, AdminChip, StatusPill, RowAction, AdminEmpty } from './AdminUI';

// One screen for the simple catalog lists (categories, sections): search,
// active/hidden filter, product count per item, and a delete confirmation
// that says how many products still use the item.

interface TaxonomyItem {
  id: string;
  image_url?: string | null;
  is_active: boolean;
}

type Filter = 'all' | 'active' | 'hidden' | 'empty';

export function TaxonomyListScreen<T extends TaxonomyItem>({
  title, noun, icon, items, isLoading, productKey, getName, editPath, addPath, onDelete, blockDeleteWhenUsed,
}: {
  title: string;
  /** Singular noun for messages, e.g. "الفئة". */
  noun: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: T[] | undefined;
  isLoading: boolean;
  /** Which product column points at this item. */
  productKey: 'category_id' | 'section_id';
  getName: (item: T) => string;
  editPath: (id: string) => string;
  addPath: string;
  onDelete: (id: string) => void;
  /** The database refuses the delete while products use the item (categories). */
  blockDeleteWhenUsed?: boolean;
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  // Same query key as the dashboard and products screen, so this is usually cached.
  const { data: productsPage } = useProductsPage({ availableOnly: false, page: 0, limit: 9999 });
  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    productsPage?.data?.forEach((p) => {
      const id = p[productKey];
      if (id) counts[id] = (counts[id] ?? 0) + 1;
    });
    return counts;
  }, [productsPage, productKey]);

  const list = items ?? [];
  const tests: Record<Filter, (i: T) => boolean> = {
    all: () => true,
    active: (i) => i.is_active,
    hidden: (i) => !i.is_active,
    empty: (i) => !productCounts[i.id],
  };
  const chips: Array<{ key: Filter; label: string }> = [
    { key: 'all', label: 'الكل' },
    { key: 'active', label: 'نشط' },
    { key: 'hidden', label: 'مخفي' },
    { key: 'empty', label: 'بدون منتجات' },
  ];

  const q = query.trim().toLowerCase();
  const visible = list.filter((i) => tests[filter](i) && (!q || getName(i).toLowerCase().includes(q)));

  async function confirmDelete(item: T) {
    const used = productCounts[item.id] ?? 0;
    if (used && blockDeleteWhenUsed) {
      await confirm({
        title: `لا يمكن حذف ${noun}`,
        message: `"${getName(item)}" مرتبطة بـ ${used} منتج. انقل هذه المنتجات إلى ${noun.replace(/^ال/, '')} أخرى أو احذفها أولاً.`,
        confirmText: 'حسناً',
        hideCancel: true,
      });
      return;
    }
    const ok = await confirm({
      title: `حذف ${noun}`,
      message: used
        ? `"${getName(item)}" مرتبط بـ ${used} منتج. بعد الحذف ستبقى هذه المنتجات بدون ${noun.replace(/^ال/, '')}. هل تريد المتابعة؟`
        : `حذف "${getName(item)}"؟`,
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      destructive: true,
    });
    if (ok) onDelete(item.id);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface, direction: 'rtl' as any }}>
      <AdminHeader
        title={title}
        subtitle={isLoading ? undefined : `${visible.length} من ${list.length}`}
        actions={<AdminButton primary icon="add" label="إضافة" onPress={() => router.push(addPath as any)} />}
      >
        <AdminSearch value={query} onChangeText={setQuery} placeholder="بحث بالاسم" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {chips.map((c) => {
            const count = list.filter(tests[c.key]).length;
            if (count === 0 && c.key !== 'all' && filter !== c.key) return null;
            return <AdminChip key={c.key} label={c.label} count={count} active={filter === c.key} onPress={() => setFilter(c.key)} />;
          })}
        </View>
      </AdminHeader>

      <FlatList
        data={isLoading ? [] : visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 40 }}
        ListHeaderComponent={isLoading ? (
          <View style={{ gap: 8 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Skeleton width={48} height={48} borderRadius={12} />
                <View style={{ flex: 1, gap: 8 }}>
                  <Skeleton width="50%" height={14} borderRadius={5} />
                  <Skeleton width="25%" height={11} borderRadius={5} />
                </View>
              </View>
            ))}
          </View>
        ) : null}
        ListEmptyComponent={!isLoading ? <AdminEmpty icon={icon} text={q || filter !== 'all' ? 'لا توجد نتائج مطابقة' : 'لا توجد عناصر بعد'} /> : null}
        renderItem={({ item }) => {
          const count = productCounts[item.id] ?? 0;
          return (
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={() => router.push(editPath(item.id) as any)} activeOpacity={0.8} accessibilityLabel={`تعديل ${getName(item)}`}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} accessibilityLabel={getName(item)} style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.surface }} contentFit="cover" />
                ) : (
                  <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={icon} size={20} color={COLORS.faint} />
                  </View>
                )}
              </TouchableOpacity>

              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.ink }} numberOfLines={1}>{getName(item)}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <StatusPill label={item.is_active ? 'نشط' : 'مخفي'} tone={item.is_active ? 'green' : 'muted'} />
                  <Text style={{ fontSize: 12, color: count ? COLORS.muted : COLORS.brandText }}>
                    {count ? `${count} منتج` : 'بدون منتجات'}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row' }}>
                <RowAction icon="create-outline" label="تعديل" onPress={() => router.push(editPath(item.id) as any)} />
                <RowAction icon="trash-outline" label="حذف" color={COLORS.danger} onPress={() => confirmDelete(item)} />
              </View>
            </View>
          );
        }}
      />
      {dialog}
    </SafeAreaView>
  );
}
