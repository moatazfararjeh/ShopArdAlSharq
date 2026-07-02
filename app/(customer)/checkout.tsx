import { View, Text, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { Image } from 'expo-image';
import { checkoutSchema, CheckoutFormValues } from '@/schemas/checkoutSchema';
import { usePlaceOrder } from '@/hooks/useOrders';
import { useCart } from '@/hooks/useCart';
import { useCartStore, getCartItemPrice } from '@/stores/cartStore';
import { upsertCartItem } from '@/services/cartService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPrice } from '@/utils/formatPrice';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { getProductName } from '@/types/models';
import { getCurrentLocale } from '@/i18n';

const BRAND = '#e36523';

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

// ─── Step progress indicator ──────────────────────────────────────────────────
function StepBar({ step }: { step: 1 | 2 | 3 }) {
  const steps = ['العنوان', 'الطلب', 'تأكيد'];
  return (
    <View style={{ backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f0ece6' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {steps.map((label, i) => {
          const num = i + 1;
          const done = num < step;
          const active = num === step;
          const isLast = i === steps.length - 1;
          return (
            <View key={label} style={{ flex: isLast ? 0 : 1, flexDirection: 'row', alignItems: 'center' }}>
              {/* Circle */}
              <View style={{ alignItems: 'center' }}>
                <View style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: done || active ? BRAND : '#f3f4f6',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {done
                    ? <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>✓</Text>
                    : <Text style={{ color: active ? '#fff' : '#9ca3af', fontSize: 12, fontWeight: '800' }}>{num}</Text>
                  }
                </View>
                <Text style={{
                  fontSize: 10, fontWeight: '600', marginTop: 4,
                  color: done || active ? BRAND : '#9ca3af',
                }}>
                  {label}
                </Text>
              </View>
              {/* Connector line */}
              {!isLast && (
                <View style={{
                  flex: 1, height: 2, marginBottom: 16, marginHorizontal: 6,
                  backgroundColor: done ? BRAND : '#e6e0d8',
                }} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Order items summary ───────────────────────────────────────────────────────
function OrderSummarySection({ subtotal, discount, total }: { subtotal: number; discount: number; total: number }) {
  const cartItems = useCartStore((s) => s.items);
  const locale = getCurrentLocale();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={{ borderRadius: 16, backgroundColor: '#fff', padding: 16, borderWidth: 1, borderColor: '#e6e0d8', marginBottom: 16 }}>
      {/* Header row */}
      <TouchableOpacity
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.8}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: expanded ? 12 : 0 }}
      >
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#1c1917' }}>🛒 ملخص الطلب</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 13, color: BRAND, fontWeight: '700' }}>{formatPrice(total)}</Text>
          <Text style={{ fontSize: 14, color: '#9ca3af' }}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {/* Collapsed: just item count */}
      {!expanded && (
        <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
          {cartItems.length} {cartItems.length === 1 ? 'منتج' : 'منتجات'} — اضغط للتفاصيل
        </Text>
      )}

      {/* Expanded: full item list */}
      {expanded && (
        <>
          {cartItems.map((item, idx) => {
            const price = getCartItemPrice(item);
            const imgUrl = (item.product.images?.[0] ?? item.product.product_images?.[0])?.url;
            const unitLabel = item.selected_unit
              ? ({ piece: 'حبة', carton: 'كرتون', kg: 'كيلو' } as Record<string, string>)[item.selected_unit]
              : null;
            return (
              <View
                key={`${item.product_id}-${item.selected_unit}`}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  paddingVertical: 8,
                  borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: '#f5f0eb',
                }}
              >
                <Image
                  source={{ uri: imgUrl }}
                  style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#ede8e1' }}
                  contentFit="cover"
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1c1917' }} numberOfLines={1}>
                    {getProductName(item.product, locale)}
                  </Text>
                  {unitLabel && (
                    <Text style={{ fontSize: 11, color: '#857d78', marginTop: 1 }}>
                      {unitLabel} × {item.quantity}
                    </Text>
                  )}
                  {!unitLabel && (
                    <Text style={{ fontSize: 11, color: '#857d78', marginTop: 1 }}>× {item.quantity}</Text>
                  )}
                </View>
                <Text style={{ fontSize: 13, fontWeight: '800', color: BRAND }}>
                  {formatPrice(price * item.quantity)}
                </Text>
              </View>
            );
          })}

          {/* Totals */}
          <View style={{ borderTopWidth: 1, borderTopColor: '#e6e0d8', marginTop: 8, paddingTop: 10, gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#857d78', fontSize: 13 }}>المجموع</Text>
              <Text style={{ fontWeight: '600', color: '#1c1917', fontSize: 13 }}>{formatPrice(subtotal)}</Text>
            </View>
            {discount > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#16a34a', fontSize: 13 }}>خصم</Text>
                <Text style={{ fontWeight: '600', color: '#16a34a', fontSize: 13 }}>-{formatPrice(discount)}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#857d78', fontSize: 13 }}>التوصيل</Text>
              <Text style={{ fontWeight: '600', color: '#16a34a', fontSize: 13 }}>مجاني</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f0ece6' }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#1c1917' }}>الإجمالي</Text>
              <Text style={{ fontSize: 16, fontWeight: '900', color: BRAND }}>{formatPrice(total)}</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
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

  // Derive current step for progress bar
  const step: 1 | 2 | 3 = selectedAddressId !== null || savedAddresses.length === 0 ? 2 : 1;

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
      setValue('new_address', undefined as any);
    } else {
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
          setValue('new_address', undefined as any);
        }
      });
  }, [session?.user?.id]);

  async function onSubmit(values: CheckoutFormValues) {
    setSubmitError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSubmitError('يرجى تسجيل الدخول أولاً'); return; }

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
        finalAddressId = selectedAddressId;
      } else {
        const addr = values.new_address!;
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
        if (tempAddressId) {
          await (supabase as any).from('addresses').delete().eq('id', tempAddressId);
        }
        throw orderErr;
      }

      if (tempAddressId) {
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
      {/* Header + Step bar */}
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0ece6' }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1c1917' }}>{t('checkout.title')}</Text>
        </View>
        <StepBar step={step} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 130 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Error banner */}
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
                  borderColor: selectedAddressId === addr.id ? BRAND : '#e6e0d8',
                }}
                activeOpacity={0.8}
              >
                <View style={{
                  width: 22, height: 22, borderRadius: 11, borderWidth: 2,
                  borderColor: selectedAddressId === addr.id ? BRAND : '#d1d5db',
                  backgroundColor: selectedAddressId === addr.id ? BRAND : '#fff',
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
                borderColor: selectedAddressId === null ? BRAND : '#e6e0d8',
              }}
              activeOpacity={0.8}
            >
              <View style={{
                width: 22, height: 22, borderRadius: 11, borderWidth: 2,
                borderColor: selectedAddressId === null ? BRAND : '#d1d5db',
                backgroundColor: selectedAddressId === null ? BRAND : '#fff',
                alignItems: 'center', justifyContent: 'center',
                marginLeft: 12,
              }}>
                {selectedAddressId === null && (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />
                )}
              </View>
              <Text style={{ fontWeight: '600', color: BRAND }}>＋ إضافة عنوان جديد</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── NEW ADDRESS FORM ── */}
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

            {/* ── City selector — now uses brand orange ── */}
            <Controller control={control} name="new_address.city"
              render={({ field: { onChange, value } }) => (
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, textAlign: 'right' }}>المدينة *</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {(['الزرقاء', 'عمان'] as const).map((city) => {
                      const isSelected = value === city;
                      return (
                        <TouchableOpacity
                          key={city}
                          onPress={() => onChange(city)}
                          style={{
                            flex: 1, paddingVertical: 13, borderRadius: 14,
                            alignItems: 'center',
                            backgroundColor: isSelected ? BRAND : '#f3f4f6',
                            borderWidth: 1.5,
                            borderColor: isSelected ? BRAND : '#e5e7eb',
                          }}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '700', color: isSelected ? '#fff' : '#374151' }}>
                            {city}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {errors.new_address?.city && (
                    <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 4, textAlign: 'right' }}>
                      {errors.new_address.city.message}
                    </Text>
                  )}
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
                borderColor: saveThisAddress ? BRAND : '#d1d5db',
                backgroundColor: saveThisAddress ? BRAND : '#fff',
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

        {/* ── ORDER SUMMARY ── */}
        <OrderSummarySection
          subtotal={summary.subtotal}
          discount={summary.discount}
          total={summary.total}
        />

        {/* Payment method note */}
        <View style={{ borderRadius: 12, backgroundColor: '#fff7ed', padding: 12, borderWidth: 1, borderColor: '#fed7aa', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 20 }}>💵</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1c1917' }}>{t('checkout.cashOnDelivery')}</Text>
            <Text style={{ fontSize: 11, color: '#857d78', marginTop: 2 }}>الدفع عند الاستلام — طريقة الدفع الوحيدة المتاحة</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky place-order button */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#ffffff',
        paddingHorizontal: 16, paddingVertical: 14,
        borderTopWidth: 1, borderTopColor: '#e6e0d8',
        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 10,
      }}>
        {/* Total row above the button */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ fontSize: 14, color: '#857d78' }}>الإجمالي</Text>
          <Text style={{ fontSize: 16, fontWeight: '900', color: BRAND }}>{formatPrice(summary.total)}</Text>
        </View>
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
