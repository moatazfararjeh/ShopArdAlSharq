import { ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSection, useUpdateSection } from '@/hooks/useSections';
import SectionForm from '@/components/admin/SectionForm';
import { SectionFormValues } from '@/schemas/sectionSchema';

export default function EditSectionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: section, isLoading } = useSection(id);
  const updateMutation = useUpdateSection(id);

  if (isLoading || !section) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f4f8' }}>
        <ActivityIndicator size="large" color="#e36523" />
      </SafeAreaView>
    );
  }

  async function handleSubmit(values: SectionFormValues) {
    try {
      await updateMutation.mutateAsync(values);
      if (router.canGoBack()) router.back();
      else router.push('/(admin)/sections' as any);
    } catch (e: any) {
      Alert.alert('خطأ', e?.message ?? 'فشل تحديث القسم');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f4f8' }}>
      <SectionForm
        initial={{
          name_ar: section.name_ar,
          name_en: section.name_en ?? '',
          description_ar: section.description_ar ?? '',
          description_en: section.description_en ?? '',
          image_url: section.image_url ?? '',
          sort_order: String(section.sort_order ?? 0),
          is_active: section.is_active,
        }}
        onSubmit={handleSubmit}
        submitLabel="حفظ التغييرات"
        isLoading={updateMutation.isPending}
      />
    </SafeAreaView>
  );
}
