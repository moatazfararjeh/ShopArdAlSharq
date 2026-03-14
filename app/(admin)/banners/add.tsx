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
      // Create banner first to get an ID, then upload image if needed
      const tempId = `temp-${Date.now()}`;
      let imageUrl: string | null = null;

      const banner = await createMutation.mutateAsync({
        title_ar: values.titleAr.trim(),
        title_en: values.titleEn.trim() || null,
        subtitle_ar: values.subtitleAr.trim() || null,
        subtitle_en: null,
        label_ar: values.labelAr.trim() || null,
        label_en: null,
        button_text_ar: values.buttonTextAr.trim() || null,
        button_text_en: null,
        emoji: values.emoji.trim() || null,
        image_url: null,
        bg_color: values.bgColor,
        is_active: values.isActive,
        sort_order: parseInt(values.sortOrder) || 0,
        link_type: values.linkType,
        link_value: values.linkValue,
      });

      // Upload image if one was picked
      if (values.imageUri && !values.imageUri.startsWith('http')) {
        imageUrl = await uploadBannerImage(values.imageUri, banner.id);
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


function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
      {label}{required ? <Text style={{ color: '#ef4444' }}> *</Text> : null}
    </Text>
  );
}

function StyledInput({
  value,
  onChangeText,
  placeholder,
  multiline,
  numberOfLines,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      multiline={multiline}
      numberOfLines={numberOfLines}
      style={{
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: '#111827',
        backgroundColor: '#f9fafb',
        textAlignVertical: multiline ? 'top' : 'center',
        minHeight: multiline ? 72 : 44,
      }}
    />
  );
}

export default function AddBannerScreen() {
  const router = useRouter();
  const createMutation = useCreateBanner();

  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [subtitleAr, setSubtitleAr] = useState('');
  const [labelAr, setLabelAr] = useState('');
  const [buttonTextAr, setButtonTextAr] = useState('تسوق الآن');
  const [emoji, setEmoji] = useState('🥘');
  const [bgColor, setBgColor] = useState('#1e1a17');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);

  async function handleSubmit() {
    if (!titleAr.trim()) {
      Alert.alert('خطأ', 'العنوان بالعربية مطلوب');
      return;
    }
    try {
      await createMutation.mutateAsync({
        title_ar: titleAr.trim(),
        title_en: titleEn.trim() || null,
        subtitle_ar: subtitleAr.trim() || null,
        subtitle_en: null,
        label_ar: labelAr.trim() || null,
        label_en: null,
        button_text_ar: buttonTextAr.trim() || null,
        button_text_en: null,
        emoji: emoji.trim() || '🥘',
        image_url: null,
        bg_color: bgColor,
        is_active: isActive,
        sort_order: parseInt(sortOrder) || 0,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('خطأ', e?.message ?? 'فشل الحفظ');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f0' }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>

        {/* Preview */}
        <View style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: bgColor, minHeight: 130 }}>
          <View style={{ position: 'absolute', top: -30, right: -20, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(249,115,22,0.18)' }} />
          <View style={{ padding: 20, paddingRight: 110, justifyContent: 'center', minHeight: 130 }}>
            {labelAr.trim() ? (
              <View style={{ backgroundColor: '#f97316', borderRadius: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, marginBottom: 8 }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{labelAr}</Text>
              </View>
            ) : null}
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', lineHeight: 22 }}>
              {titleAr || 'عنوان البانر'}
            </Text>
            {subtitleAr.trim() ? (
              <Text style={{ color: '#d1d5db', fontSize: 12, marginTop: 4 }}>{subtitleAr}</Text>
            ) : null}
            {buttonTextAr.trim() ? (
              <View style={{ backgroundColor: '#f97316', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, alignSelf: 'flex-start', marginTop: 8 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{buttonTextAr}</Text>
              </View>
            ) : null}
          </View>
          <View style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}>
            <Text style={{ fontSize: 52, lineHeight: 68 }}>{emoji || '🥘'}</Text>
          </View>
        </View>

        {/* Form fields */}
        <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 14 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 }}>محتوى البانر</Text>

          <View>
            <FieldLabel label="العنوان بالعربية" required />
            <StyledInput value={titleAr} onChangeText={setTitleAr} placeholder="مثال: احصل على أول طلب بتوصيل مجاني!" />
          </View>
          <View>
            <FieldLabel label="العنوان بالإنجليزية" />
            <StyledInput value={titleEn} onChangeText={setTitleEn} placeholder="Title in English" />
          </View>
          <View>
            <FieldLabel label="النص الفرعي" />
            <StyledInput value={subtitleAr} onChangeText={setSubtitleAr} placeholder="وصف قصير إضافي" multiline numberOfLines={2} />
          </View>
          <View>
            <FieldLabel label="تسمية الشارة (البيدج)" />
            <StyledInput value={labelAr} onChangeText={setLabelAr} placeholder="مثال: عرض خاص 🔥" />
          </View>
          <View>
            <FieldLabel label="نص الزر" />
            <StyledInput value={buttonTextAr} onChangeText={setButtonTextAr} placeholder="تسوق الآن" />
          </View>
          <View>
            <FieldLabel label="الإيموجي الزخرفي" />
            <StyledInput value={emoji} onChangeText={setEmoji} placeholder="🥘" />
          </View>
        </View>

        {/* Color & settings */}
        <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 14 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 }}>الإعدادات</Text>

          <View>
            <FieldLabel label="لون الخلفية" />
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              {BG_PRESETS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setBgColor(c)}
                  style={{
                    width: 38, height: 38, borderRadius: 10,
                    backgroundColor: c,
                    borderWidth: bgColor === c ? 3 : 0,
                    borderColor: '#f97316',
                  }}
                />
              ))}
            </View>
            <StyledInput value={bgColor} onChangeText={setBgColor} placeholder="#1e1a17" />
          </View>

          <View>
            <FieldLabel label="الترتيب" />
            <StyledInput
              value={sortOrder}
              onChangeText={setSortOrder}
              placeholder="0"
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 14, color: '#374151', fontWeight: '600' }}>نشط</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ true: '#f97316', false: '#d1d5db' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={createMutation.isPending}
          style={{
            backgroundColor: createMutation.isPending ? '#d1d5db' : '#f97316',
            borderRadius: 14,
            paddingVertical: 15,
            alignItems: 'center',
            shadowColor: '#f97316',
            shadowOpacity: createMutation.isPending ? 0 : 0.4,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
            {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ البانر'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
