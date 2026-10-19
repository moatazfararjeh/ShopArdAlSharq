import { View, Text, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/lib/theme';
import { LocationPicker, LatLng } from '@/components/address/LocationPicker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { Input } from '@/components/ui/Input';
import { formatPrice } from '@/utils/formatPrice';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/errorLogger';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { useRecordProductEvent } from '@/hooks/useAnalytics';
import { getProductName } from '@/types/models';
import { getCurrentLocale } from '@/i18n';

const BRAND = COLORS.brandFill;

// ─── Bottom sticky button wrapper ─────────────────────────────────────────────
function BottomButton({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{
      // Web: pin to the viewport above CustomerWebLayout's fixed 64px bottom bar.
      // Native: sits above the (absolute) tab bar.
      position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as any, left: 0, right: 0, zIndex: 50,
      bottom: Platform.OS === 'web' ? 64 : 0,
      backgroundColor: '#ffffff',
      paddingHorizontal: 16, paddingTop: 12,
      paddingBottom: Platform.OS === 'web' ? 12 : Math.max(insets.bottom, 12) + (Platform.OS === 'ios' ? 84 : 64),
      borderTopWidth: 1, borderTopColor: COLORS.line,
    }}>
      {children}
    </View>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 12, direction: 'rtl' as any }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.ink }}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

// ─── Selectable row (radio) ───────────────────────────────────────────────────
function RadioRow({ selected, onPress, children }: { selected: boolean; onPress?: () => void; children: React.ReactNode }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      activeOpacity={0.8}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderRadius: 14, padding: selected ? 12 : 13, marginBottom: 8,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? COLORS.brandFill : COLORS.line,
        backgroundColor: selected ? '#FFF6F1' : '#fff',
      }}
    >
      <View style={{
        width: 20, height: 20, borderRadius: 10, borderWidth: 2,
        borderColor: selected ? COLORS.brandFill : '#C9C1B9',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {selected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.brandFill }} />}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </TouchableOpacity>
  );
}

interface SavedAddress {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  city: string;
  district?: string | null;
  street?: string | null;
  is_default?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

// ─── Order items summary ───────────────────────────────────────────────────────
function OrderSummarySection({ subtotal, discount, total }: { subtotal: number; discount: number; total: number }) {
  const cartItems = useCartStore((s) => s.items);
  const locale = getCurrentLocale();
  const [expanded, setExpanded] = useState(false);

  const row = (label: string, value: string, green?: boolean) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: COLORS.muted, fontSize: 14 }}>{label}</Text>
      <Text style={{ fontWeight: green ? '600' : '500', color: green ? COLORS.green : COLORS.ink, fontSize: 14 }}>{value}</Text>
    </View>
  );

  return (
    <Section
      title="ملخص الطلب"
      action={
        <TouchableOpacity onPress={() => setExpanded((e) => !e)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.brandText }}>
            {expanded ? 'إخفاء المنتجات' : `${cartItems.length} ${cartItems.length === 1 ? 'منتج' : 'منتجات'}`}
          </Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={15} color={COLORS.brandText} />
        </TouchableOpacity>
      }
    >
      {expanded && cartItems.map((item) => {
        const price = getCartItemPrice(item);
        const imgUrl = (item.product.images?.[0] ?? item.product.product_images?.[0])?.url;
        const unitLabel = item.selected_unit
          ? ({ piece: 'حبة', carton: 'كرتون', kg: 'كيلو' } as Record<string, string>)[item.selected_unit]
          : null;
        return (
          <View
            key={`${item.product_id}-${item.selected_unit}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.line }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.surface, padding: 4 }}>
              <Image source={{ uri: imgUrl }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.ink }} numberOfLines={1}>
                {getProductName(item.product, locale)}
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 1 }}>
                {unitLabel ? `${unitLabel} × ${item.quantity}` : `× ${item.quantity}`}
              </Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.ink }}>
              {formatPrice(price * item.quantity)}
            </Text>
          </View>
        );
      })}

      <View style={{ gap: 10, marginTop: expanded ? 10 : 0 }}>
        {row('المجموع', formatPrice(subtotal))}
        {discount > 0 && row('الخصم', `−${formatPrice(discount)}`, true)}
        {row('التوصيل', 'مجاني', true)}
        <View style={{ height: 1, backgroundColor: COLORS.line }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.ink }}>الإجمالي</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.ink }}>{formatPrice(total)}</Text>
        </View>
      </View>
    </Section>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function CheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { summary, clearCart } = useCart();
  const cartItems = useCartStore((s) => s.items);
  const placeOrder = usePlaceOrder();
  const { session, profile } = useAuthStore();
  const { show: showToast } = useToastStore();
  const recordEvent = useRecordProductEvent();
  const scrollRef = useRef<any>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [saveThisAddress, setSaveThisAddress] = useState(true);
  // Map pins for saved addresses created before locations were required
  const [savedPins, setSavedPins] = useState<Record<string, LatLng>>({});
  const [pinError, setPinError] = useState<string | null>(null);
  // Commercial register validation: derived directly from store so it updates immediately after upload
  const hasCommercialRegister = profile ? !!(profile as any).commercial_register_url : null;

  const {
    control,
    handleSubmit,
    setValue,
    watch,
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
        latitude: undefined as unknown as number,   // required — set on the map
        longitude: undefined as unknown as number,
      },
    },
  });
  const newCity = watch('new_address.city');
  const newLat  = watch('new_address.latitude');
  const newLng  = watch('new_address.longitude');

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
        latitude: undefined as unknown as number,
        longitude: undefined as unknown as number,
      });
    }
  }

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    // Load saved addresses
    supabase
      .from('addresses')
      .select('id, label, recipient_name, phone, city, district, street, is_default, latitude, longitude')
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
    if (submitting) return; // guard against double-tap re-entrancy
    setSubmitError(null);
    setSubmitting(true);
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
        // Older saved addresses have no map location: it must be pinned once here
        const saved = savedAddresses.find((a) => a.id === selectedAddressId);
        if (saved && (saved.latitude == null || saved.longitude == null)) {
          const pin = savedPins[selectedAddressId];
          if (!pin) {
            const msg = 'يرجى تحديد موقع العنوان على الخريطة';
            setPinError(msg);
            setSubmitError(msg);
            showToast(msg, 'error');
            scrollRef.current?.scrollTo({ y: 0, animated: true });
            return;
          }
          const { error: pinSaveError } = await (supabase.from('addresses') as any)
            .update({ latitude: pin.latitude, longitude: pin.longitude })
            .eq('id', selectedAddressId);
          if (pinSaveError) { setSubmitError(pinSaveError.message); return; }
          setSavedAddresses((list) => list.map((a) => a.id === selectedAddressId ? { ...a, ...pin } : a));
        }
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
            latitude: addr.latitude,
            longitude: addr.longitude,
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

      // The order is confirmed at this point. Clear the cart and navigate to
      // the success screen right away, before any non-critical follow-up —
      // that way a failure below can't make a real order look like it
      // failed and invite the user to submit a duplicate.
      clearCart();
      router.replace({
        pathname: '/(customer)/order-success',
        params: { orderId: result.order_id, orderNumber: result.order_number },
      });

      // Best-effort cleanup — must not affect the success flow above.
      try {
        if (tempAddressId) {
          await (supabase as any).from('addresses').delete().eq('id', tempAddressId);
        }
        for (const item of cartItems) {
          recordEvent.mutate({ productId: item.product_id, eventType: 'purchase', userId: session?.user?.id ?? undefined });
        }
      } catch {
        // non-critical; the order already succeeded
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ، يرجى المحاولة مجددًا';
      logError(err, 'checkout.placeOrder', {
        userId: session?.user?.id,
        metadata: { cartItemCount: cartItems.length, paymentMethod: values.payment_method },
      });
      setSubmitError(msg);
      showToast(msg, 'error');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } finally {
      setSubmitting(false);
    }
  }

  const submit = handleSubmit(onSubmit, (fieldErrors) => {
    const firstMsg = Object.values(fieldErrors)
      .flatMap((e: any) => (typeof e?.message === 'string' ? [e.message] : Object.values(e ?? {}).map((x: any) => x?.message).filter(Boolean)))
      [0] as string | undefined;
    const msg = firstMsg ?? 'يرجى ملء جميع الحقول المطلوبة';
    setSubmitError(msg);
    showToast(msg, 'error');
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface, direction: 'rtl' as any }} edges={['top']}>
      {/* Header */}
      <View style={{ backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(customer)/cart'))}
          accessibilityLabel="رجوع"
          style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="arrow-forward" size={22} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 19, fontWeight: '700', color: COLORS.ink }}>{t('checkout.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 220 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Commercial register missing — soft reminder only */}
        {hasCommercialRegister === false && (
          <TouchableOpacity
            onPress={() => router.push('/(customer)/profile' as any)}
            activeOpacity={0.85}
            style={{
              marginBottom: 12, borderRadius: 14, backgroundColor: '#FFF8E6',
              padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
            }}
          >
            <Ionicons name="document-text-outline" size={24} color="#8A5A00" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#6B4500', marginBottom: 2 }}>
                السجل التجاري غير مرفق
              </Text>
              <Text style={{ fontSize: 12, color: '#6B4500', lineHeight: 18 }}>
                ارفعه من ملفك الشخصي لتسريع معالجة طلبك.
              </Text>
            </View>
            <Ionicons name="chevron-back" size={18} color="#6B4500" />
          </TouchableOpacity>
        )}

        {/* Error banner */}
        {(submitError || placeOrder.error) && (
          <View style={{ marginBottom: 12, borderRadius: 12, backgroundColor: '#FDECEC', padding: 12 }}>
            <Text style={{ color: COLORS.danger, fontSize: 13 }}>
              {submitError ?? (placeOrder.error as Error).message}
            </Text>
          </View>
        )}

        {/* ── DELIVERY ADDRESS ── */}
        <Section title="عنوان التوصيل">
          {savedAddresses.map((addr) => (
            <RadioRow key={addr.id} selected={selectedAddressId === addr.id} onPress={() => selectAddress(addr.id)}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.ink }}>
                {addr.label} — {addr.recipient_name}
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>
                {addr.city}{addr.district ? ` · ${addr.district}` : ''}{addr.street ? ` · ${addr.street}` : ''}
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.muted, textAlign: 'right' }}>{addr.phone}</Text>
              {(addr.latitude == null || addr.longitude == null) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Ionicons name="location-outline" size={13} color={COLORS.brandText} />
                  <Text style={{ fontSize: 12, color: COLORS.brandText, fontWeight: '600' }}>بحاجة لتحديد الموقع على الخريطة</Text>
                </View>
              )}
            </RadioRow>
          ))}

          {/* Selected saved address has no location yet → pin it once before ordering */}
          {(() => {
            const sel = savedAddresses.find((a) => a.id === selectedAddressId);
            if (!sel || (sel.latitude != null && sel.longitude != null)) return null;
            return (
              <View style={{ marginTop: 4, marginBottom: 8 }}>
                <Text style={{ fontSize: 13, color: COLORS.muted, marginBottom: 8, lineHeight: 19 }}>
                  حدّد موقع "{sel.label}" على الخريطة مرة واحدة، وسنحفظه لطلباتك القادمة.
                </Text>
                <LocationPicker
                  key={sel.id}
                  value={savedPins[sel.id] ?? null}
                  onChange={(p) => { setSavedPins((m) => ({ ...m, [sel.id]: p })); setPinError(null); }}
                  city={sel.city}
                  error={pinError ?? undefined}
                />
              </View>
            );
          })()}

          {savedAddresses.length > 0 && (
            <RadioRow selected={selectedAddressId === null} onPress={() => selectAddress(null)}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.brandText }}>إضافة عنوان جديد</Text>
            </RadioRow>
          )}

          {/* New address form */}
          {selectedAddressId === null && (
            <View style={{ marginTop: savedAddresses.length > 0 ? 6 : 0 }}>
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
                    <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.ink, marginBottom: 8, textAlign: 'right' }}>المدينة *</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {(['عمان', 'الزرقاء'] as const).map((city) => {
                        const isSelected = value === city;
                        return (
                          <TouchableOpacity
                            key={city}
                            onPress={() => onChange(city)}
                            accessibilityState={{ selected: isSelected }}
                            style={{
                              flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                              backgroundColor: isSelected ? COLORS.ink : '#fff',
                              borderWidth: 1, borderColor: isSelected ? COLORS.ink : COLORS.line,
                            }}
                          >
                            <Text style={{ fontSize: 14, fontWeight: '600', color: isSelected ? '#fff' : COLORS.ink }}>{city}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {errors.new_address?.city && (
                      <Text style={{ fontSize: 12, color: COLORS.danger, marginTop: 4, textAlign: 'right' }}>
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

              <LocationPicker
                value={newLat != null && newLng != null ? { latitude: newLat, longitude: newLng } : null}
                onChange={(p) => {
                  setValue('new_address.latitude', p.latitude, { shouldValidate: true });
                  setValue('new_address.longitude', p.longitude, { shouldValidate: true });
                }}
                city={newCity}
                error={errors.new_address?.latitude?.message ?? errors.new_address?.longitude?.message}
              />

              <TouchableOpacity
                onPress={() => setSaveThisAddress(!saveThisAddress)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: saveThisAddress }}
                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 10, minHeight: 44 }}
                activeOpacity={0.7}
              >
                <View style={{
                  width: 22, height: 22, borderRadius: 6, borderWidth: 2,
                  borderColor: saveThisAddress ? COLORS.brandFill : '#C9C1B9',
                  backgroundColor: saveThisAddress ? COLORS.brandFill : '#fff',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {saveThisAddress && <Ionicons name="checkmark" size={15} color="#fff" />}
                </View>
                <Text style={{ fontSize: 14, color: COLORS.ink }}>حفظ هذا العنوان للمرة القادمة</Text>
              </TouchableOpacity>
            </View>
          )}
        </Section>

        {/* ── PAYMENT ── */}
        <Section title="طريقة الدفع">
          <RadioRow selected>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="cash-outline" size={22} color={COLORS.ink} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.ink }}>{t('checkout.cashOnDelivery')}</Text>
                <Text style={{ fontSize: 12, color: COLORS.muted }}>نقداً للسائق عند وصول الطلب</Text>
              </View>
            </View>
          </RadioRow>
        </Section>

        {/* ── NOTES ── */}
        <Section title={t('checkout.orderNotes')}>
          <Controller control={control} name="notes"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input value={value ?? ''} onChangeText={onChange} onBlur={onBlur}
                placeholder={t('checkout.orderNotesPlaceholder')} multiline numberOfLines={3} />
            )} />
        </Section>

        {/* ── ORDER SUMMARY ── */}
        <OrderSummarySection
          subtotal={summary.subtotal}
          discount={summary.discount}
          total={summary.total}
        />
      </ScrollView>

      {/* Sticky place-order button */}
      <BottomButton>
        <TouchableOpacity
          onPress={submit}
          disabled={submitting}
          activeOpacity={0.85}
          style={{
            backgroundColor: COLORS.brandFill, borderRadius: 14, height: 54, paddingHorizontal: 18,
            flexDirection: 'row', alignItems: 'center',
            justifyContent: submitting ? 'center' : 'space-between',
            opacity: submitting ? 0.8 : 1, direction: 'rtl' as any,
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{t('checkout.placeOrder')}</Text>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{formatPrice(summary.total)}</Text>
            </>
          )}
        </TouchableOpacity>
      </BottomButton>
    </SafeAreaView>
  );
}
