import { View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCreateBanner } from '@/hooks/useBanners';
import BannerForm, { BannerFormValues } from '@/components/admin/BannerForm';
import { uploadBannerImage } from '@/services/bannerService';

export default function AddBannerScreen() {
  const router = useRouter();
  const createMutation = useCreateBanner();

  async function handleSubmit(values: BannerFormValues) {
    try {
      const banner = await createMutation.mutateAsync({
        title_ar: '',
        title_en: null,
        subtitle_ar: null,
        subtitle_en: null,
        label_ar: null,
        label_en: null,
        button_text_ar: values.buttonTextAr.trim() || null,
        button_text_en: null,
        emoji: null,
        image_url: null,
        bg_color: '#1e1a17',
        is_active: values.isActive,
        sort_order: parseInt(values.sortOrder) || 0,
        link_type: values.linkType,
        link_value: values.linkValue,
      });

      if (values.imageUri && !values.imageUri.startsWith('http')) {
        const imageUrl = await uploadBannerImage(values.imageUri, banner.id);
        const { updateBanner } = await import('@/services/bannerService');
        await updateBanner(banner.id, { image_url: imageUrl });
      }

      router.back();
    } catch (e: any) {
      Alert.alert('خطأ', e?.message ?? 'فشل الحفظ');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f0' }}>
      <BannerForm
        onSubmit={handleSubmit}
        submitLabel="إضافة البانر"
        isLoading={createMutation.isPending}
      />
    </SafeAreaView>
  );
}
