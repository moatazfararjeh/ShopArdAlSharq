import { ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useBanner, useUpdateBanner } from '@/hooks/useBanners';
import { uploadBannerImage } from '@/services/bannerService';
import BannerForm, { BannerFormValues } from '@/components/admin/BannerForm';

export default function EditBannerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: banner, isLoading } = useBanner(id);
  const updateMutation = useUpdateBanner(id);

  if (isLoading || !banner) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f0' }}>
        <ActivityIndicator size="large" color="#f97316" />
      </SafeAreaView>
    );
  }

  async function handleSubmit(values: BannerFormValues) {
    try {
      let imageUrl = values.imageUri;

      if (values.imageUri && !values.imageUri.startsWith('http')) {
        imageUrl = await uploadBannerImage(values.imageUri, banner!.id);
      }

      await updateMutation.mutateAsync({
        title_ar: values.titleAr.trim(),
        title_en: values.titleEn.trim() || null,
        subtitle_ar: values.subtitleAr.trim() || null,
        subtitle_en: null,
        label_ar: values.labelAr.trim() || null,
        label_en: null,
        button_text_ar: values.buttonTextAr.trim() || null,
        button_text_en: null,
        emoji: values.emoji.trim() || null,
        image_url: imageUrl ?? null,
        bg_color: values.bgColor,
        is_active: values.isActive,
        sort_order: parseInt(values.sortOrder) || 0,
        link_type: values.linkType,
        link_value: values.linkValue,
      });

      if (router.canGoBack()) router.back();
      else router.push('/(admin)/dashboard' as any);
    } catch (e: any) {
      Alert.alert('خطأ', e?.message ?? 'فشل الحفظ');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f0' }}>
      <BannerForm
        initial={{
          titleAr: banner.title_ar,
          titleEn: banner.title_en ?? '',
          subtitleAr: banner.subtitle_ar ?? '',
          labelAr: banner.label_ar ?? '',
          buttonTextAr: banner.button_text_ar ?? 'تسوق الآن',
          emoji: banner.emoji ?? '',
          bgColor: banner.bg_color,
          sortOrder: String(banner.sort_order),
          isActive: banner.is_active,
          imageUri: banner.image_url ?? null,
          linkType: banner.link_type ?? null,
          linkValue: banner.link_value ?? null,
        }}
        onSubmit={handleSubmit}
        submitLabel="حفظ التغييرات"
        isLoading={updateMutation.isPending}
      />
    </SafeAreaView>
  );
}