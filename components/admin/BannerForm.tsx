/**
 * Shared banner form used by both Add and Edit banner screens.
 * Features: image upload, link to product or category, bg color, active toggle.
 */
import { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  Switch, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useCategories } from '@/hooks/useCategories';
import { useProducts } from '@/hooks/useProducts';
import { getCurrentLocale } from '@/i18n';
import { getCategoryName, getProductName } from '@/types/models';
import { BannerPayload } from '@/services/bannerService';

const BG_PRESETS = ['#1e1a17', '#7c3aed', '#0f766e', '#b45309', '#be185d', '#1d4ed8'];

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
      {label}{required ? <Text style={{ color: '#ef4444' }}> *</Text> : null}
    </Text>
  );
}

function StyledInput({
  value, onChangeText, placeholder, multiline, numberOfLines, keyboardType,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: any;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      multiline={multiline}
      numberOfLines={numberOfLines}
      keyboardType={keyboardType}
      style={{
        borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 10,
        fontSize: 14, color: '#111827', backgroundColor: '#f9fafb',
        textAlignVertical: multiline ? 'top' : 'center',
        minHeight: multiline ? 72 : 44,
      }}
    />
  );
}

export interface BannerFormValues {
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  labelAr: string;
  buttonTextAr: string;
  emoji: string;
  bgColor: string;
  sortOrder: string;
  isActive: boolean;
  imageUri: string | null;   // local URI (new pick) or existing URL
  linkType: 'product' | 'category' | null;
  linkValue: string | null;
}

interface Props {
  initial?: Partial<BannerFormValues>;
  onSubmit: (values: BannerFormValues) => Promise<void>;
  submitLabel: string;
  isLoading: boolean;
}

export default function BannerFormScreen({ initial, onSubmit, submitLabel, isLoading }: Props) {
  const locale = getCurrentLocale();
  const { data: categories } = useCategories();
  const { data: productsData } = useProducts({ availableOnly: false, limit: 200 });
  const allProducts = productsData?.pages.flatMap((p) => p.data) ?? [];

  const [titleAr, setTitleAr] = useState(initial?.titleAr ?? '');
  const [titleEn, setTitleEn] = useState(initial?.titleEn ?? '');
  const [subtitleAr, setSubtitleAr] = useState(initial?.subtitleAr ?? '');
  const [labelAr, setLabelAr] = useState(initial?.labelAr ?? '');
  const [buttonTextAr, setButtonTextAr] = useState(initial?.buttonTextAr ?? 'تسوق الآن');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '');
  const [bgColor, setBgColor] = useState(initial?.bgColor ?? '#1e1a17');
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? '0');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [imageUri, setImageUri] = useState<string | null>(initial?.imageUri ?? null);
  const [linkType, setLinkType] = useState<'product' | 'category' | null>(initial?.linkType ?? null);
  const [linkValue, setLinkValue] = useState<string | null>(initial?.linkValue ?? null);
  const [showLinkPicker, setShowLinkPicker] = useState(false);

  async function pickImage() {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('الإذن مطلوب', 'يرجى السماح بالوصول إلى الصور');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 7],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  function getLinkLabel() {
    if (!linkType || !linkValue) return 'لا يوجد رابط';
    if (linkType === 'category') {
      const cat = categories?.find((c) => c.id === linkValue);
      return cat ? `قسم: ${getCategoryName(cat, locale)}` : `قسم: ${linkValue}`;
    }
    const prod = allProducts.find((p) => p.id === linkValue);
    return prod ? `منتج: ${getProductName(prod, locale)}` : `منتج: ${linkValue}`;
  }

  async function handleSubmit() {
    if (!titleAr.trim()) {
      Alert.alert('خطأ', 'العنوان بالعربية مطلوب');
      return;
    }
    await onSubmit({
      titleAr, titleEn, subtitleAr, labelAr, buttonTextAr,
      emoji, bgColor, sortOrder, isActive, imageUri, linkType, linkValue,
    });
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
      {/* Preview */}
      <View style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: bgColor, minHeight: 140 }}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" />
        ) : null}
        <View style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: imageUri ? '60%' : '100%',
          backgroundColor: imageUri ? 'rgba(0,0,0,0.45)' : bgColor,
        }} />
        <View style={{ padding: 20, paddingRight: emoji ? 100 : 20, justifyContent: 'center', minHeight: 140 }}>
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
        {emoji ? (
          <View style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}>
            <Text style={{ fontSize: 52, lineHeight: 68 }}>{emoji}</Text>
          </View>
        ) : null}
      </View>

      {/* Image upload */}
      <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>صورة البانر</Text>
        <TouchableOpacity
          onPress={pickImage}
          style={{
            height: 52, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed',
            borderColor: '#e36523', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'row', gap: 8, backgroundColor: '#fff7ed',
          }}
        >
          <Ionicons name="image-outline" size={20} color="#e36523" />
          <Text style={{ color: '#e36523', fontWeight: '700', fontSize: 14 }}>
            {imageUri ? 'تغيير الصورة' : 'رفع صورة'}
          </Text>
        </TouchableOpacity>
        {imageUri ? (
          <TouchableOpacity onPress={() => setImageUri(null)}>
            <Text style={{ color: '#ef4444', fontSize: 12, textAlign: 'center' }}>× حذف الصورة</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Link */}
      <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>رابط البانر (اختياري)</Text>
        <Text style={{ fontSize: 12, color: '#857d78' }}>عند الضغط على البانر ينتقل المستخدم إلى المنتج أو القسم المحدد</Text>

        {/* Link type selector */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {(['none', 'product', 'category'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => { setLinkType(t === 'none' ? null : t); setLinkValue(null); setShowLinkPicker(t !== 'none'); }}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                backgroundColor: (t === 'none' ? linkType === null : linkType === t) ? '#e36523' : '#f3f4f6',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: (t === 'none' ? linkType === null : linkType === t) ? '#fff' : '#374151' }}>
                {t === 'none' ? 'بدون' : t === 'product' ? 'منتج' : 'قسم'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Picker */}
        {linkType === 'category' && (
          <View style={{ gap: 6 }}>
            <FieldLabel label="اختر القسم" />
            {(categories ?? []).map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setLinkValue(cat.id)}
                style={{
                  padding: 12, borderRadius: 12, borderWidth: 1.5,
                  borderColor: linkValue === cat.id ? '#e36523' : '#e5e7eb',
                  backgroundColor: linkValue === cat.id ? '#fff7ed' : '#f9fafb',
                }}
              >
                <Text style={{ color: linkValue === cat.id ? '#e36523' : '#374151', fontWeight: '600' }}>
                  {getCategoryName(cat, locale)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {linkType === 'product' && (
          <View style={{ gap: 6 }}>
            <FieldLabel label="اختر المنتج" />
            <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
              {allProducts.map((prod) => (
                <TouchableOpacity
                  key={prod.id}
                  onPress={() => setLinkValue(prod.id)}
                  style={{
                    padding: 12, borderRadius: 12, borderWidth: 1.5, marginBottom: 6,
                    borderColor: linkValue === prod.id ? '#e36523' : '#e5e7eb',
                    backgroundColor: linkValue === prod.id ? '#fff7ed' : '#f9fafb',
                  }}
                >
                  <Text style={{ color: linkValue === prod.id ? '#e36523' : '#374151', fontWeight: '600' }}>
                    {getProductName(prod, locale)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {(linkType && linkValue) ? (
          <View style={{ backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10 }}>
            <Text style={{ color: '#16a34a', fontWeight: '600', fontSize: 13 }}>✓ {getLinkLabel()}</Text>
          </View>
        ) : null}
      </View>

      {/* Content */}
      <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 14 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>محتوى البانر</Text>
        <View><FieldLabel label="العنوان بالعربية" required /><StyledInput value={titleAr} onChangeText={setTitleAr} placeholder="مثال: احصل على أول طلب بتوصيل مجاني!" /></View>
        <View><FieldLabel label="العنوان بالإنجليزية" /><StyledInput value={titleEn} onChangeText={setTitleEn} placeholder="Title in English" /></View>
        <View><FieldLabel label="النص الفرعي" /><StyledInput value={subtitleAr} onChangeText={setSubtitleAr} placeholder="وصف قصير إضافي" multiline numberOfLines={2} /></View>
        <View><FieldLabel label="تسمية الشارة (البيدج)" /><StyledInput value={labelAr} onChangeText={setLabelAr} placeholder="مثال: عرض خاص 🔥" /></View>
        <View><FieldLabel label="نص الزر" /><StyledInput value={buttonTextAr} onChangeText={setButtonTextAr} placeholder="تسوق الآن" /></View>
        <View><FieldLabel label="الإيموجي الزخرفي" /><StyledInput value={emoji} onChangeText={setEmoji} placeholder="🥘 (اختياري إذا رفعت صورة)" /></View>
      </View>

      {/* Settings */}
      <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 14 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>الإعدادات</Text>
        <View>
          <FieldLabel label="لون الخلفية" />
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
            {BG_PRESETS.map((c) => (
              <TouchableOpacity key={c} onPress={() => setBgColor(c)} style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: c, borderWidth: bgColor === c ? 3 : 0, borderColor: '#f97316' }} />
            ))}
          </View>
          <StyledInput value={bgColor} onChangeText={setBgColor} placeholder="#1e1a17" />
        </View>
        <View><FieldLabel label="الترتيب" /><StyledInput value={sortOrder} onChangeText={setSortOrder} placeholder="0" keyboardType="numeric" /></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 14, color: '#374151', fontWeight: '600' }}>نشط</Text>
          <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: '#f97316', false: '#d1d5db' }} thumbColor="#fff" />
        </View>
      </View>

      {/* Submit */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isLoading}
        activeOpacity={0.85}
        style={{ backgroundColor: '#e36523', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', minHeight: 52 }}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{submitLabel}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
