import { View, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCategories, useDeleteCategory } from '@/hooks/useCategories';
import { Button } from '@/components/ui/Button';
import { getCurrentLocale } from '@/i18n';
import { getCategoryName } from '@/types/models';

export default function AdminCategoriesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = getCurrentLocale();
  const { data: categories, isLoading } = useCategories(false);
  const deleteMutation = useDeleteCategory();

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
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between bg-white px-4 py-3 shadow-sm">
        <Button
          title={t('admin.addCategory')}
          size="sm"
          onPress={() => router.push('/(admin)/categories/add')}
        />
        <Text className="text-lg font-bold text-gray-900">{t('admin.manageCategories')}</Text>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard')} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18, color: '#374151' }}>›</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="mx-4 my-1 flex-row items-center rounded-2xl bg-white p-4 shadow-sm">
            <View className="flex-1">
              <Text className="font-semibold text-gray-900">{getCategoryName(item, locale)}</Text>
              <Text className={['text-xs', item.is_active ? 'text-green-500' : 'text-red-400'].join(' ')}>
                {item.is_active ? 'نشطة' : 'غير نشطة'}
              </Text>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity
                className="rounded-lg bg-gray-100 px-3 py-1.5"
                onPress={() => router.push(`/(admin)/categories/${item.id}` as any)}
              >
                <Text className="text-sm">{t('common.edit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="rounded-lg bg-red-50 px-3 py-1.5"
                onPress={() => confirmDelete(item.id, getCategoryName(item, locale))}
              >
                <Text className="text-sm text-red-500">{t('common.delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <View className="mt-20 items-center">
              <Text className="text-gray-400">{t('categories.noCategories')}</Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    </SafeAreaView>
  );
}

