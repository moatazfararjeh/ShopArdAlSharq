import { Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCreateCategory } from '@/hooks/useCategories';
import CategoryForm, { CategoryFormProps } from '@/components/admin/CategoryForm';
import { CategoryFormValues } from '@/schemas/categorySchema';

export default function AddCategoryScreen() {
  const router = useRouter();
  const createMutation = useCreateCategory();

  async function handleSubmit(values: CategoryFormValues) {
    try {
      await createMutation.mutateAsync(values);
      if (router.canGoBack()) router.back();
      else router.push('/(admin)/categories' as any);
    } catch (e: any) {
      Alert.alert('خطأ', e?.message ?? 'فشل حفظ التصنيف');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f4f8' }}>
      <CategoryForm
        onSubmit={handleSubmit}
        submitLabel="إضافة التصنيف"
        isLoading={createMutation.isPending}
      />
    </SafeAreaView>
  );
}
