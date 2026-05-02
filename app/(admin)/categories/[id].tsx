import { ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCategory, useUpdateCategory } from '@/hooks/useCategories';
import CategoryForm from '@/components/admin/CategoryForm';
import { CategoryFormValues } from '@/schemas/categorySchema';

export default function EditCategoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: category, isLoading } = useCategory(id);
  const updateMutation = useUpdateCategory(id);

  if (isLoading || !category) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f0' }}>
        <ActivityIndicator size="large" color="#e36523" />
      </SafeAreaView>
    );
  }

  async function handleSubmit(values: CategoryFormValues) {
    try {
      await updateMutation.mutateAsync(values);
      if (router.canGoBack()) router.back();
      else router.push('/(admin)/categories' as any);
    } catch (e: any) {
      Alert.alert('خطأ', e?.message ?? 'فشل تحديث التصنيف');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f0' }}>
      <CategoryForm
        initial={{
          name_ar: category.name_ar,
          name_en: category.name_en ?? '',
          description_ar: category.description_ar ?? '',
          description_en: category.description_en ?? '',
          sort_order: String(category.sort_order ?? 0),
          is_active: category.is_active,
        }}
        onSubmit={handleSubmit}
        submitLabel="حفظ التغييرات"
        isLoading={updateMutation.isPending}
      />
    </SafeAreaView>
  );
}
