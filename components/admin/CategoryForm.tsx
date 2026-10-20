import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Switch,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { CategoryFormValues } from '@/schemas/categorySchema';
import { uploadImage } from '@/services/storageService';
import { CATEGORY_IMAGE_BUCKET } from '@/lib/constants';
import { useSections } from '@/hooks/useSections';
import { getSectionName } from '@/types/models';
import { getCurrentLocale } from '@/i18n';

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
      {label}
      {required ? <Text style={{ color: '#ef4444' }}> *</Text> : null}
    </Text>
  );
}

function StyledInput({
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: any;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      keyboardType={keyboardType}
      multiline={multiline}
      style={{
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: '#111827',
        backgroundColor: '#f9fafb',
        minHeight: multiline ? 80 : 44,
        textAlignVertical: multiline ? 'top' : 'center',
      }}
    />
  );
}

export interface CategoryFormProps {
  initial?: Partial<CategoryFormValues> & { image_url?: string | null };
  onSubmit: (values: CategoryFormValues) => Promise<void>;
  submitLabel: string;
  isLoading: boolean;
}

export default function CategoryForm({ initial, onSubmit, submitLabel, isLoading }: CategoryFormProps) {
  const locale = getCurrentLocale();
  const { data: sections } = useSections(false);
  const [sectionId, setSectionId] = useState(initial?.section_id ?? '');
  const [sectionPickerOpen, setSectionPickerOpen] = useState(false);
  const [nameAr, setNameAr] = useState(initial?.name_ar ?? '');
  const [nameEn, setNameEn] = useState(initial?.name_en ?? '');
  const [descAr, setDescAr] = useState(initial?.description_ar ?? '');
  const [descEn, setDescEn] = useState(initial?.description_en ?? '');
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? '0');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function pickImage() {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
    }
  }

  async function handleFileChange(e: any) {
    const file = e?.target?.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({ ...prev, image: 'يُسمح فقط بصور JPEG, PNG, WebP' }));
      return;
    }

    setUploading(true);
    setErrors((prev) => ({ ...prev, image: '' }));
    try {
      const fileName = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${file.type.split('/')[1]}`;
      const result = await uploadImage(CATEGORY_IMAGE_BUCKET, fileName, file);
      setImageUrl(result.publicUrl);
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, image: err?.message ?? 'فشل رفع الصورة' }));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSubmit() {
    const newErrors: Record<string, string> = {};
    if (!nameAr || nameAr.trim().length < 2) {
      newErrors.name_ar = 'الاسم بالعربية مطلوب (حرفان على الأقل)';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    await onSubmit({
      section_id: sectionId || '',
      name_ar: nameAr.trim(),
      name_en: nameEn.trim() || '',
      description_ar: descAr.trim() || '',
      description_en: descEn.trim() || '',
      image_url: imageUrl || '',
      sort_order: sortOrder,
      is_active: isActive,
    });
  }

  return (
    <>
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
      {/* Category Image */}
      <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>صورة التصنيف</Text>

        <View style={{ alignItems: 'center', gap: 12 }}>
          {imageUrl ? (
            <View style={{ position: 'relative' }}>
              <Image
                source={{ uri: imageUrl }}
                style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#e5e7eb' }}
                contentFit="cover"
              />
              <TouchableOpacity
                onPress={() => setImageUrl('')}
                style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 24, height: 24, borderRadius: 12,
                  backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{
              width: 100, height: 100, borderRadius: 50,
              backgroundColor: '#f3f4f6', borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="image-outline" size={32} color="#9ca3af" />
            </View>
          )}

          <TouchableOpacity
            onPress={pickImage}
            disabled={uploading}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: '#f3f4f6', borderRadius: 10,
              paddingHorizontal: 16, paddingVertical: 10,
            }}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#e36523" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={18} color="#374151" />
            )}
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>
              {uploading ? 'جارٍ الرفع...' : imageUrl ? 'تغيير الصورة' : 'رفع صورة'}
            </Text>
          </TouchableOpacity>

          {errors.image ? (
            <Text style={{ color: '#ef4444', fontSize: 12 }}>{errors.image}</Text>
          ) : null}

          {Platform.OS === 'web' && (
            <input
              ref={fileInputRef as any}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          )}
        </View>
      </View>

      {/* Category Data */}
      <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>بيانات التصنيف</Text>

        <View>
          <FieldLabel label="القسم" />
          <TouchableOpacity
            onPress={() => setSectionPickerOpen(true)}
            style={{
              borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#f9fafb',
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <Text style={{ fontSize: 14, color: sectionId ? '#111827' : '#9ca3af' }}>
              {(() => {
                const selected = sections?.find((s) => s.id === sectionId);
                return selected ? getSectionName(selected, locale) : 'بدون قسم';
              })()}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <View>
          <FieldLabel label="الاسم بالعربية" required />
          <StyledInput
            value={nameAr}
            onChangeText={(v) => { setNameAr(v); setErrors((e) => ({ ...e, name_ar: '' })); }}
            placeholder="مثال: إلكترونيات"
          />
          {errors.name_ar ? (
            <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.name_ar}</Text>
          ) : null}
        </View>

        <View>
          <FieldLabel label="الاسم بالإنجليزية" />
          <StyledInput
            value={nameEn}
            onChangeText={setNameEn}
            placeholder="e.g. Electronics"
          />
        </View>

        <View>
          <FieldLabel label="الوصف بالعربية" />
          <StyledInput
            value={descAr}
            onChangeText={setDescAr}
            placeholder="وصف التصنيف بالعربية..."
            multiline
          />
        </View>

        <View>
          <FieldLabel label="الوصف بالإنجليزية" />
          <StyledInput
            value={descEn}
            onChangeText={setDescEn}
            placeholder="Category description in English..."
            multiline
          />
        </View>
      </View>

      {/* Settings */}
      <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>الإعدادات</Text>

        <View>
          <FieldLabel label="ترتيب العرض" />
          <StyledInput
            value={sortOrder}
            onChangeText={setSortOrder}
            placeholder="0"
            keyboardType="number-pad"
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 14, color: '#374151', fontWeight: '600' }}>نشط</Text>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: '#d1d5db', true: '#e36523' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Submit */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isLoading || uploading}
        style={{
          backgroundColor: isLoading || uploading ? '#f9a57a' : '#e36523',
          borderRadius: 14,
          paddingVertical: 14,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
          {isLoading ? 'جارٍ الحفظ...' : submitLabel}
        </Text>
      </TouchableOpacity>
    </ScrollView>

    <Modal visible={sectionPickerOpen} transparent animationType="fade" onRequestClose={() => setSectionPickerOpen(false)}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}
        activeOpacity={1}
        onPress={() => setSectionPickerOpen(false)}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{
          width: 300, maxHeight: 420, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
        }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#1e293b' }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff', textAlign: 'right' }}>اختر القسم</Text>
          </View>
          <FlatList
            data={[{ id: '', name_ar: 'بدون قسم', name_en: 'بدون قسم' } as any, ...(sections ?? [])]}
            style={{ maxHeight: 360 }}
            keyExtractor={(item) => item.id || '__none__'}
            renderItem={({ item }) => {
              const selected = item.id === sectionId;
              return (
                <TouchableOpacity
                  onPress={() => { setSectionId(item.id); setSectionPickerOpen(false); }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: 16, paddingVertical: 12,
                    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
                    backgroundColor: selected ? '#fff7ed' : '#fff',
                  }}
                >
                  {selected && <Ionicons name="checkmark" size={16} color="#e36523" />}
                  <Text style={{ flex: 1, fontSize: 14, color: selected ? '#e36523' : '#111827', fontWeight: selected ? '700' : '400', textAlign: 'right' }}>
                    {item.id ? getSectionName(item, locale) : item.name_ar}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
    </>
  );
}
