import { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { addressSchema, AddressFormValues } from '@/schemas/checkoutSchema';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function EditAddressScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const { show: showToast } = useToastStore();

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: '',
      recipient_name: '',
      phone: '',
      city: 'عمان' as 'عمان' | 'الزرقاء',
      district: '',
      street: '',
      building_number: undefined,
      floor_number: undefined,
      apartment_number: undefined,
      notes: undefined,
      is_default: false,
    },
  });

  useEffect(() => {
    if (!id) return;
    supabase.from('addresses').select('*').eq('id', id).single().then(({ data }) => {
      if (!data) return;
      reset({
        label: data.label ?? '',
        recipient_name: data.recipient_name ?? '',
        phone: data.phone ?? '',
        city: (data.city === 'عمان' || data.city === 'الزرقاء') ? data.city : 'عمان',
        district: data.district ?? '',
        street: data.street ?? '',
        building_number: data.building_number ?? undefined,
        floor_number: data.floor_number ?? undefined,
        apartment_number: data.apartment_number ?? undefined,
        notes: data.notes ?? undefined,
        is_default: data.is_default ?? false,
      });
    });
  }, [id]);

  async function onSubmit(values: AddressFormValues) {
    if (!id || !session?.user?.id) return;

    // If setting as default, clear existing default first
    if (values.is_default) {
      await (supabase.from('addresses') as any)
        .update({ is_default: false })
        .eq('user_id', session.user.id);
    }

    const { error } = await (supabase.from('addresses') as any)
      .update({
        label: values.label,
        recipient_name: values.recipient_name,
        phone: values.phone,
        city: values.city,
        district: values.district || null,
        street: values.street || null,
        building_number: values.building_number || null,
        floor_number: values.floor_number || null,
        apartment_number: values.apartment_number || null,
        notes: values.notes || null,
        is_default: values.is_default,
      })
      .eq('id', id);

    if (error) {
      showToast('فشل حفظ العنوان: ' + error.message, 'error');
      return;
    }

    showToast('تم حفظ العنوان', 'success');
    router.canGoBack() ? router.back() : router.replace('/(customer)/addresses' as any);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f7f5' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderBottomWidth: 1, borderBottomColor: '#e6e0d8',
      }}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(customer)/addresses' as any)}>
          <Ionicons name="arrow-forward" size={22} color="#1c1917" />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '800', color: '#1c1917' }}>تعديل العنوان</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Controller control={control} name="label"
          render={({ field: { onChange, value, onBlur } }) => (
            <Input label="تسمية العنوان *" value={value} onChangeText={onChange} onBlur={onBlur}
              placeholder="المنزل، العمل..." error={errors.label?.message} />
          )}
        />
        <Controller control={control} name="recipient_name"
          render={({ field: { onChange, value, onBlur } }) => (
            <Input label="اسم المستلم *" value={value} onChangeText={onChange} onBlur={onBlur}
              placeholder="الاسم الكامل" error={errors.recipient_name?.message} />
          )}
        />
        <Controller control={control} name="phone"
          render={({ field: { onChange, value, onBlur } }) => (
            <Input label="رقم الجوال *" value={value} onChangeText={onChange} onBlur={onBlur}
              placeholder="07xxxxxxxx" keyboardType="phone-pad" maxLength={10} error={errors.phone?.message} />
          )}
        />
        <Controller control={control} name="city"
          render={({ field: { onChange, value } }) => (
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, textAlign: 'right' }}>المدينة *</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {(['الزرقاء', 'عمان'] as const).map((city) => (
                  <TouchableOpacity
                    key={city}
                    onPress={() => onChange(city)}
                    style={{
                      flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
                      backgroundColor: value === city ? '#1c1917' : '#f3f4f6',
                      borderWidth: 1.5,
                      borderColor: value === city ? '#1c1917' : '#e5e7eb',
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: value === city ? '#fff' : '#374151' }}>{city}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.city && <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 4, textAlign: 'right' }}>{errors.city.message}</Text>}
            </View>
          )}
        />
        <Controller control={control} name="district"
          render={({ field: { onChange, value, onBlur } }) => (
            <Input label="الحي *" value={value ?? ''} onChangeText={onChange} onBlur={onBlur}
              placeholder="اسم الحي" error={errors.district?.message} />
          )}
        />
        <Controller control={control} name="street"
          render={({ field: { onChange, value, onBlur } }) => (
            <Input label="الشارع *" value={value ?? ''} onChangeText={onChange} onBlur={onBlur}
              placeholder="اسم الشارع" error={errors.street?.message} />
          )}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
        </View>
        <Controller control={control} name="notes"
          render={({ field: { onChange, value, onBlur } }) => (
            <Input label="ملاحظات" value={value ?? ''} onChangeText={onChange} onBlur={onBlur}
              placeholder="أي تفاصيل إضافية (اختياري)" multiline numberOfLines={2} />
          )}
        />

        {/* Default toggle */}
        <Controller control={control} name="is_default"
          render={({ field: { onChange, value } }) => (
            <TouchableOpacity
              onPress={() => onChange(!value)}
              style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10, marginBottom: 24 }}
              activeOpacity={0.7}
            >
              <View style={{
                width: 22, height: 22, borderRadius: 6, borderWidth: 2,
                borderColor: value ? '#e36523' : '#d1d5db',
                backgroundColor: value ? '#e36523' : '#fff',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {value && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>✓</Text>}
              </View>
              <Text style={{ fontSize: 14, color: '#1c1917', fontWeight: '500' }}>تعيين كعنوان افتراضي</Text>
            </TouchableOpacity>
          )}
        />

        <Button
          title="حفظ التعديلات"
          onPress={handleSubmit(onSubmit)}
          isLoading={isSubmitting}
          fullWidth
          size="lg"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
