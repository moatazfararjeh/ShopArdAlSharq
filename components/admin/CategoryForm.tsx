import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { CategoryFormValues } from '@/schemas/categorySchema';

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
  initial?: Partial<CategoryFormValues>;
  onSubmit: (values: CategoryFormValues) => Promise<void>;
  submitLabel: string;
  isLoading: boolean;
}

export default function CategoryForm({ initial, onSubmit, submitLabel, isLoading }: CategoryFormProps) {
  const [nameAr, setNameAr] = useState(initial?.name_ar ?? '');
  const [nameEn, setNameEn] = useState(initial?.name_en ?? '');
  const [descAr, setDescAr] = useState(initial?.description_ar ?? '');
  const [descEn, setDescEn] = useState(initial?.description_en ?? '');
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? '0');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      name_ar: nameAr.trim(),
      name_en: nameEn.trim() || '',
      description_ar: descAr.trim() || '',
      description_en: descEn.trim() || '',
      sort_order: sortOrder,
      is_active: isActive,
    });
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
      {/* Arabic Name */}
      <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>بيانات التصنيف</Text>

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
        disabled={isLoading}
        style={{
          backgroundColor: isLoading ? '#f9a57a' : '#e36523',
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
  );
}
