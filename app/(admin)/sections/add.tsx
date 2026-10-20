import { Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCreateSection } from '@/hooks/useSections';
import SectionForm from '@/components/admin/SectionForm';
import { SectionFormValues } from '@/schemas/sectionSchema';

export default function AddSectionScreen() {
  const router = useRouter();
  const createMutation = useCreateSection();

  async function handleSubmit(values: SectionFormValues) {
    try {
      await createMutation.mutateAsync(values);
      if (router.canGoBack()) router.back();
      else router.push('/(admin)/sections' as any);
    } catch (e: any) {
      Alert.alert('خطأ', e?.message ?? 'فشل حفظ القسم');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f4f8' }}>
      <SectionForm
        onSubmit={handleSubmit}
        submitLabel="إضافة القسم"
        isLoading={createMutation.isPending}
      />
    </SafeAreaView>
  );
}
