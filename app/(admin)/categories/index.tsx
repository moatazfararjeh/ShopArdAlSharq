import { View, Text, TouchableOpacity, Alert, Platform, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { Skeleton } from '@/components/ui/Skeleton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useCategories, useDeleteCategory } from '@/hooks/useCategories';
import { getCurrentLocale } from '@/i18n';
import { getCategoryName } from '@/types/models';

const C = { surface: '#f0f4f8', card: '#ffffff', brand: '#e36523', text: '#1e293b', muted: '#64748b', hairline: '#e2e8f0' };

export default function AdminCategoriesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = getCurrentLocale();
  const { data: categories, isLoading } = useCategories(false);
  const deleteMutation = useDeleteCategory();

  function confirmDelete(id: string, name: string) {
    if (Platform.OS === 'web') {
      if (window.confirm(`${t('admin.confirmDelete')}\n${name}`)) deleteMutation.mutate(id);
      return;
    }
    Alert.alert(t('admin.confirmDelete'), name, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }}>
      {/* ── Header ── */}
      <View style={{
        backgroundColor: C.card, paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: C.hairline,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard')}
          style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="home-outline" size={18} color={C.muted} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>{t('admin.manageCategories')}</Text>
        <TouchableOpacity
          onPress={() => router.push('/(admin)/categories/add')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.brand, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 }}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>إضافة</Text>
        </TouchableOpacity>
      </View>

      {/* ── List ── */}
      <FlatList
        data={categories ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 32 }}
        ListHeaderComponent={
          isLoading ? (
            <View style={{ gap: 8 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={{ backgroundColor: C.card, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Skeleton width={32} height={32} borderRadius={10} />
                    <Skeleton width={32} height={32} borderRadius={10} />
                  </View>
                  <View style={{ gap: 6, alignItems: 'flex-end' }}>
                    <Skeleton width={110} height={14} borderRadius={5} />
                    <Skeleton width={50} height={18} borderRadius={20} />
                  </View>
                </View>
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={{ paddingTop: 80, alignItems: 'center', gap: 10 }}>
              <Ionicons name="grid-outline" size={48} color="#cbd5e1" />
              <Text style={{ color: C.muted, fontSize: 15, fontWeight: '600' }}>{t('categories.noCategories')}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={{
            backgroundColor: C.card, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
            flexDirection: 'row', alignItems: 'center', gap: 12,
            shadowColor: '#1e293b', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
          }}>
            {/* Thumbnail */}
            {(item as any).image_url ? (
              <Image source={{ uri: (item as any).image_url }} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#f1f5f9' }} contentFit="cover" />
            ) : (
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="grid-outline" size={20} color="#94a3b8" />
              </View>
            )}

            {/* Info */}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }} numberOfLines={1}>
                {getCategoryName(item, locale)}
              </Text>
              <View style={{
                alignSelf: 'flex-start', marginTop: 4,
                paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20,
                backgroundColor: item.is_active ? '#f0fdf4' : '#fff1f2',
              }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: item.is_active ? '#16a34a' : '#ef4444' }}>
                  {item.is_active ? 'نشطة' : 'غير نشطة'}
                </Text>
              </View>
            </View>

            {/* Icon actions */}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                onPress={() => router.push(`/(admin)/categories/${item.id}` as any)}
                style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="create-outline" size={16} color="#3b82f6" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => confirmDelete(item.id, getCategoryName(item, locale))}
                style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
