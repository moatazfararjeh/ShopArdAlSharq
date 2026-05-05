import { View, Text, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { checkoutSchema, CheckoutFormValues } from '@/schemas/checkoutSchema';
import { usePlaceOrder } from '@/hooks/useOrders';
import { useCart } from '@/hooks/useCart';
import { useCartStore } from '@/stores/cartStore';
import { upsertCartItem } from '@/services/cartService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPrice } from '@/utils/formatPrice';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';

interface SavedAddress {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  city: string;
  district?: string | null;
  street?: string | null;
  is_default?: boolean;
}

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { summary, clearCart } = useCart();
  const cartItems = useCartStore((s) => s.items);
  const placeOrder = usePlaceOrder();
  const { session } = useAuthStore();
  const { show: showToast } = useToastStore();
  const scrollRef = useRef<any>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [saveThisAddress, setSaveThisAddress] = useState(true);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      address_id: 'new',
      payment_method: 'cash_on_delivery',
      notes: '',
      new_address: {
        label: 'المنزل',
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
    },
  });

  function selectAddress(id: string | null) {
    setSelectedAddressId(id);
    setValue('address_id', id ?? 'new');
    if (id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setValue('new_address', undefined as any);
    } else {
      // Restore default new_address values when switching back to "new"
      setValue('new_address', {
        label: 'المنزل',
        recipient_name: '',
        phone: '',
        city: 'عمان',
        district: '',
        street: '',
        building_number: undefined,
        floor_number: undefined,
        apartment_number: undefined,
        notes: undefined,
        is_default: false,
      });
    }
  }

  // Load saved addresses on mount
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    supabase
      .from('addresses')
      .select('id, label, recipient_name, phone, city, district, street, is_default')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSavedAddresses(data as SavedAddress[]);
          const def = (data as SavedAddress[]).find((a) => a.is_default) ?? data[0];
          setSelectedAddressId(def.id);
          setValue('address_id', def.id);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setValue('new_address', undefined as any);
        }
      });
  }, [session?.user?.id]);

  async function onSubmit(values: CheckoutFormValues) {
    setSubmitError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSubmitError('يرجى تسجيل الدخول أولاً'); return; }

      // Sync local Zustand cart → DB before placing order.
      // Handles the case where a prior DB write failed silently.
      if (cartItems.length === 0) {
        const msg = 'السلة فارغة. يرجى إضافة منتجات أولاً.';
        setSubmitError(msg);
        showToast(msg, 'error');
        return;
      }
      await Promise.all(
        cartItems.map((item) =>
          upsertCartItem(user.id, item.product_id, item.quantity, item.selected_unit),
        ),
      );

      let finalAddressId: string;
      let tempAddressId: string | null = null;

      if (selectedAddressId) {
        // Use existing saved address
        finalAddressId = selectedAddressId;
      } else {
        // New address — insert it temporarily to obtain an id for the order snapshot
        const addr = values.new_address!;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: addrRow, error: addrError } = await (supabase as any)
          .from('addresses')
          .insert({
            user_id: user.id,
            label: addr.label,
            recipient_name: addr.recipient_name,
            phone: addr.phone,
            city: addr.city,
            district: addr.district || null,
            street: addr.street || null,
            building_number: addr.building_number || null,
            floor_number: addr.floor_number || null,
            apartment_number: addr.apartment_number || null,
            notes: addr.notes || null,
            is_default: addr.is_default,
          })
          .select('id')
          .single();

        if (addrError) { setSubmitError(addrError.message); return; }
        finalAddressId = addrRow.id;
        // Track it so we can clean up if the user chose not to save AND if
        // the order placement fails for any reason.
        if (!saveThisAddress) tempAddressId = finalAddressId;
      }

      let result;
      try {
        result = await placeOrder.mutateAsync({
          address_id: finalAddressId,
          payment_method: values.payment_method,
          notes: values.notes ?? null,
        });
      } catch (orderErr) {
        // If a throwaway address was inserted, delete it now to avoid orphans
        if (tempAddressId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).from('addresses').delete().eq('id', tempAddressId);
        }
        throw orderErr;
      }

      // Order succeeded — delete address if the user chose not to save it
      if (tempAddressId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('addresses').delete().eq('id', tempAddressId);
      }

      clearCart();
      router.replace({
        pathname: '/(customer)/order-success',
        params: { orderId: result.order_id, orderNumber: result.order_number },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ، يرجى المحاولة مجددًا';
      setSubmitError(msg);
      showToast(msg, 'error');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f7f5' }}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#1c1917', marginBottom: 16 }}>{t('checkout.title')}</Text>

        {/* Errors */}
        {(submitError || placeOrder.error) && (
          <View style={{ marginBottom: 12, borderRadius: 12, backgroundColor: '#fef2f2', padding: 12 }}>
            <Text style={{ color: '#dc2626', fontSize: 13 }}>
              {submitError ?? (placeOrder.error as Error).message}
            </Text>
          </View>
        )}

        {/* ── SAVED ADDRESSES ── */}
        {savedAddresses.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1c1917', marginBottom: 10 }}>
              📍 عناوين محفوظة
            </Text>
            {savedAddresses.map((addr) => (
              <TouchableOpacity
                key={addr.id}
                onPress={() => selectAddress(addr.id)}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: selectedAddressId === addr.id ? '#fff7ed' : '#ffffff',
                  borderRadius: 14, padding: 14, marginBottom: 8,
                  borderWidth: 1.5,
                  borderColor: selectedAddressId === addr.id ? '#e36523' : '#e6e0d8',
                }}
                activeOpacity={0.8}
              >
                <View style={{
                  width: 22, height: 22, borderRadius: 11, borderWidth: 2,
                  borderColor: selectedAddressId === addr.id ? '#e36523' : '#d1d5db',
                  backgroundColor: selectedAddressId === addr.id ? '#e36523' : '#fff',
                  alignItems: 'center', justifyContent: 'center',
                  marginLeft: 12,
                }}>
                  {selectedAddressId === addr.id && (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: '#1c1917', marginBottom: 2 }}>
                    {addr.label} — {addr.recipient_name}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#857d78' }}>
                    {addr.city}{addr.district ? ` · ${addr.district}` : ''}{addr.street ? ` · ${addr.street}` : ''}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#857d78' }}>{addr.phone}</Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Add new address option */}
            <TouchableOpacity
              onPress={() => selectAddress(null)}
              style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: selectedAddressId === null ? '#fff7ed' : '#ffffff',
                borderRadius: 14, padding: 14,
                borderWidth: 1.5,
                borderColor: selectedAddressId === null ? '#e36523' : '#e6e0d8',
              }}
              activeOpacity={0.8}
            >
              <View style={{
                width: 22, height: 22, borderRadius: 11, borderWidth: 2,
                borderColor: selectedAddressId === null ? '#e36523' : '#d1d5db',
                backgroundColor: selectedAddressId === null ? '#e36523' : '#fff',
                alignItems: 'center', justifyContent: 'center',
                marginLeft: 12,
              }}>
                {selectedAddressId === null && (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />
                )}
              </View>
              <Text style={{ fontWeight: '600', color: '#e36523' }}>＋ إضافة عنوان جديد</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── NEW ADDRESS FORM ── shown when no saved addresses OR user picked "new" */}
        {selectedAddressId === null && (
          <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e6e0d8' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1c1917', marginBottom: 12 }}>
              {savedAddresses.length > 0 ? 'عنوان جديد' : '📍 عنوان التوصيل'}
            </Text>

            <Controller control={control} name="new_address.recipient_name"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input label="اسم المستلم *" value={value ?? ''} onChangeText={onChange} onBlur={onBlur}
                  placeholder="الاسم الكامل" error={errors.new_address?.recipient_name?.message} />
              )} />

            <Controller control={control} name="new_address.phone"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input label="رقم الجوال *" value={value ?? ''} onChangeText={onChange} onBlur={onBlur}
                  placeholder="07xxxxxxxx" keyboardType="phone-pad" maxLength={10}
                  error={errors.new_address?.phone?.message} />
              )} />

            <Controller control={control} name="new_address.city"
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
                  {errors.new_address?.city && <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 4, textAlign: 'right' }}>{errors.new_address.city.message}</Text>}
                </View>
              )} />

            <Controller control={control} name="new_address.district"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input label="الحي *" value={value ?? ''} onChangeText={onChange} onBlur={onBlur}
                  placeholder="اسم الحي" error={errors.new_address?.district?.message} />
              )} />

            <Controller control={control} name="new_address.street"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input label="الشارع *" value={value ?? ''} onChangeText={onChange} onBlur={onBlur}
                  placeholder="اسم الشارع" error={errors.new_address?.street?.message} />
              )} />

            {/* Save address toggle */}
            <TouchableOpacity
              onPress={() => setSaveThisAddress(!saveThisAddress)}
              style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 }}
              activeOpacity={0.7}
            >
              <View style={{
                width: 22, height: 22, borderRadius: 6, borderWidth: 2,
                borderColor: saveThisAddress ? '#e36523' : '#d1d5db',
                backgroundColor: saveThisAddress ? '#e36523' : '#fff',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {saveThisAddress && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>✓</Text>}
              </View>
              <Text style={{ fontSize: 14, color: '#1c1917', fontWeight: '500' }}>
                حفظ هذا العنوان للمرة القادمة
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Order notes */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#1c1917', marginBottom: 8 }}>{t('checkout.orderNotes')}</Text>
          <Controller control={control} name="notes"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input value={value ?? ''} onChangeText={onChange} onBlur={onBlur}
                placeholder={t('checkout.orderNotesPlaceholder')} multiline numberOfLines={3} />
            )} />
        </View>

        {/* Order summary */}
        <View style={{ borderRadius: 16, backgroundColor: '#ffffff', padding: 16, borderWidth: 1, borderColor: '#e6e0d8' }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#1c1917', marginBottom: 12 }}>ملخص الطلب</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: '#857d78' }}>{t('cart.subtotal')}</Text>
            <Text style={{ fontWeight: '600', color: '#1c1917' }}>{formatPrice(summary.subtotal)}</Text>
          </View>
          {summary.discount > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ color: '#16a34a' }}>{t('cart.discount')}</Text>
              <Text style={{ fontWeight: '600', color: '#16a34a' }}>-{formatPrice(summary.discount)}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#e6e0d8', paddingTop: 10, marginTop: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1c1917' }}>{t('cart.total')}</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#e36523' }}>{formatPrice(summary.total)}</Text>
          </View>
          <Text style={{ fontSize: 11, color: '#857d78', marginTop: 8 }}>
            طريقة الدفع: {t('checkout.cashOnDelivery')}
          </Text>
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#e6e0d8' }}>
        <Button
          title={placeOrder.isPending ? '' : t('checkout.placeOrder')}
          onPress={handleSubmit(onSubmit, (fieldErrors) => {
            const firstMsg = Object.values(fieldErrors)
              .flatMap((e: any) => (typeof e?.message === 'string' ? [e.message] : Object.values(e ?? {}).map((x: any) => x?.message).filter(Boolean)))
              [0] as string | undefined;
            const msg = firstMsg ?? 'يرجى ملء جميع الحقول المطلوبة';
            setSubmitError(msg);
            showToast(msg, 'error');
            scrollRef.current?.scrollTo({ y: 0, animated: true });
          })}
          isLoading={placeOrder.isPending}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

