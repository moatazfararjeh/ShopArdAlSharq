import { View, Text, TouchableOpacity, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useBanners, useDeleteBanner } from '@/hooks/useBanners';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/types/models';
import { getCurrentLocale } from '@/i18n';
import { getBannerTitle } from '@/types/models';

export default function AdminBannersScreen() {
  const router = useRouter();
  const locale = getCurrentLocale();
  const { data: banners, isLoading } = useBanners(false);
  const deleteMutation = useDeleteBanner();

  function confirmDelete(id: string, title: string) {
    Alert.alert('حذف البانر', title, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  }

  function renderItem({ item }: { item: Banner }) {
    return (
      <View style={{ marginHorizontal: 16, marginVertical: 6, borderRadius: 16, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, overflow: 'hidden' }}>
        {/* Color preview strip */}
        <View style={{ height: 6, backgroundColor: item.bg_color ?? '#1e1a17' }} />
        <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center' }}>
          {/* Emoji preview */}
          <Text style={{ fontSize: 32, marginRight: 12 }}>{item.emoji ?? '🥘'}</Text>

          {/* Info */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 15, color: '#111827' }}>
              {getBannerTitle(item, locale)}
            </Text>
            {item.label_ar ? (
              <Text style={{ fontSize: 12, color: '#f97316', marginTop: 2 }}>{item.label_ar}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: item.is_active ? '#10b981' : '#ef4444' }}>
                {item.is_active ? 'نشط' : 'غير نشط'}
              </Text>
              <Text style={{ fontSize: 11, color: '#9ca3af' }}>ترتيب: {item.sort_order}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={{ backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}
              onPress={() => router.push(`/(admin)/banners/${item.id}` as any)}
            >
              <Text style={{ fontSize: 13 }}>تعديل</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ backgroundColor: '#fef2f2', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}
              onPress={() => confirmDelete(item.id, getBannerTitle(item, locale))}
            >
              <Text style={{ fontSize: 13, color: '#ef4444' }}>حذف</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f0' }}>
      {/* Header bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>البانرات الإعلانية</Text>
        <Button
          title="+ إضافة بانر"
          size="sm"
          onPress={() => router.push('/(admin)/banners/add')}
        />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#6b7280' }}>جاري التحميل...</Text>
        </View>
      ) : (banners?.length ?? 0) === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Text style={{ fontSize: 40 }}>🖼️</Text>
          <Text style={{ color: '#6b7280', fontSize: 15 }}>لا توجد بانرات بعد</Text>
        </View>
      ) : (
        <FlatList
          data={banners}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 12 }}
        />
      )}
    </SafeAreaView>
  );
}
