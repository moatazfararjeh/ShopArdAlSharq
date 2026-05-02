import { View, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useProducts } from '@/hooks/useProducts';
import { useDeleteProduct } from '@/hooks/useProducts';
import { getCurrentLocale } from '@/i18n';
import { getProductName } from '@/types/models';
import { formatPrice } from '@/utils/formatPrice';
import { Product } from '@/types/models';
import { Button } from '@/components/ui/Button';

export default function AdminProductsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = getCurrentLocale();
  const { data, isLoading } = useProducts({ availableOnly: false });
  const deleteMutation = useDeleteProduct();

  const products: Product[] = data?.pages.flatMap((p) => p.data) ?? [];

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
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between bg-white px-4 py-3 shadow-sm">
        <Text className="text-lg font-bold text-gray-900">{t('admin.manageProducts')}</Text>
        <Button
          title={t('admin.addProduct')}
          size="sm"
          onPress={() => router.push('/(admin)/products/add')}
        />
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="mx-4 my-1 flex-row items-center rounded-2xl bg-white p-3">
            <View className="flex-1">
              <Text className="font-semibold text-gray-900" numberOfLines={1}>
                {getProductName(item, locale)}
              </Text>
              {item.categories && (
                <Text className="text-xs text-gray-400" numberOfLines={1}>
                  {locale === 'ar' ? item.categories.name_ar : (item.categories.name_en ?? item.categories.name_ar)}
                </Text>
              )}
              <Text className="text-sm text-primary-500">{formatPrice(item.price)}</Text>
              <Text className={['text-xs', item.is_available ? 'text-green-500' : 'text-red-400'].join(' ')}>
                {item.is_available ? 'متوفر' : 'غير متوفر'}
              </Text>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => router.push(`/(admin)/products/${item.id}/edit`)}
                className="rounded-lg bg-gray-100 px-3 py-1.5"
              >
                <Text className="text-sm">{t('common.edit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => confirmDelete(item.id, getProductName(item, locale))}
                className="rounded-lg bg-red-50 px-3 py-1.5"
              >
                <Text className="text-sm text-red-500">{t('common.delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <View className="mt-20 items-center">
              <Text className="text-gray-400">{t('products.noProducts')}</Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    </SafeAreaView>
  );
}

