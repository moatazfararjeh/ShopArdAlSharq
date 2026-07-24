import { View, Text, TouchableOpacity, Alert, FlatList, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBanners, useDeleteBanner } from '@/hooks/useBanners';
import { Banner } from '@/types/models';
import { getCurrentLocale } from '@/i18n';
import { getBannerTitle } from '@/types/models';

const C = { surface: '#f0f4f8', card: '#ffffff', brand: '#e36523', text: '#1e293b', muted: '#64748b', hairline: '#e2e8f0' };

function BannerCard({ item, onEdit, onDelete }: { item: Banner; onEdit: () => void; onDelete: () => void }) {
  const locale = getCurrentLocale();

  return (
    <View style={{
      backgroundColor: C.card, borderRadius: 20,
      marginHorizontal: 16, marginVertical: 5,
      overflow: 'hidden',
      shadowColor: '#1e293b', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 3,
    }}>
      {/* Color accent strip */}
      <View style={{ height: 5, backgroundColor: item.bg_color ?? '#1e1a17' }} />

      <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {/* Image or emoji */}
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={{ width: 56, height: 56, borderRadius: 12 }} contentFit="cover" />
        ) : (
          <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: (item.bg_color ?? '#1e1a17') + '22', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 28 }}>{item.emoji ?? '🖼️'}</Text>
          </View>
        )}

        {/* Info */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }} numberOfLines={1}>
            {getBannerTitle(item, locale)}
          </Text>
          {item.label_ar ? (
            <Text style={{ fontSize: 12, color: C.brand, marginTop: 2 }} numberOfLines={1}>{item.label_ar}</Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 }}>
            <View style={{
              paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20,
              backgroundColor: item.is_active ? '#f0fdf4' : '#fff1f2',
            }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: item.is_active ? '#16a34a' : '#ef4444' }}>
                {item.is_active ? 'نشط' : 'غير نشط'}
              </Text>
            </View>
            <Text style={{ fontSize: 10, color: C.muted }}>ترتيب: {item.sort_order}</Text>
            {item.link_type ? (
              <Text style={{ fontSize: 10, color: C.muted }}>{item.link_type}</Text>
            ) : null}
          </View>
        </View>

        {/* Icon actions */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
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
    </View>
  );
}

export default function AdminBannersScreen() {
  const router = useRouter();
  const locale = getCurrentLocale();
  const { data: banners, isLoading } = useBanners(false);
  const deleteMutation = useDeleteBanner();

  function confirmDelete(id: string, title: string) {
    if (Platform.OS === 'web') {
      if (window.confirm(`هل تريد حذف البانر؟\n${title}`)) deleteMutation.mutate(id);
      return;
    }
    Alert.alert('حذف البانر', title, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
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
        <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>البانرات الإعلانية</Text>
        <TouchableOpacity
          onPress={() => router.push('/(admin)/banners/add')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.brand, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 }}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>إضافة</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.brand} />
        </View>
      ) : (banners?.length ?? 0) === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Ionicons name="images-outline" size={48} color="#cbd5e1" />
          <Text style={{ color: C.muted, fontSize: 15, fontWeight: '600' }}>لا توجد بانرات بعد</Text>
          <TouchableOpacity
            onPress={() => router.push('/(admin)/banners/add')}
            style={{ backgroundColor: C.brand, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>إضافة أول بانر</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={banners}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 10, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <BannerCard
              item={item}
              onEdit={() => router.push(`/(admin)/banners/${item.id}` as any)}
              onDelete={() => confirmDelete(item.id, getBannerTitle(item, locale))}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
