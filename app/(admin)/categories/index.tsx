import { View, Text, TouchableOpacity, Alert } from 'react-native';
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
    Alert.alert(t('admin.confirmDelete'), name, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between bg-white px-4 py-3 shadow-sm">
        <Text className="text-lg font-bold text-gray-900">{t('admin.manageCategories')}</Text>
        <Button
          title={t('admin.addCategory')}
          size="sm"
          onPress={() => router.push('/(admin)/categories/add')}
        />
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
                onPress={() => {}}
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

