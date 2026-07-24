import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch, ActivityIndicator, TouchableOpacity, Alert, Platform } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { productSchema, ProductFormValues } from '@/schemas/productSchema';
import { useProduct, useUpdateProduct } from '@/hooks/useProducts';
import { useProductImages } from '@/hooks/useProductImages';
import { useCategories } from '@/hooks/useCategories';
import { useBrands } from '@/hooks/useBrands';
import { Input } from '@/components/ui/Input';
import { getCurrentLocale } from '@/i18n';
import { getCategoryName } from '@/types/models';
import { useStockAlertSubscriberCount } from '@/hooks/useStockAlerts';
import { sendStockAvailableNotifications } from '@/services/pushNotificationService';

const C = { surface: '#f0f4f8', card: '#ffffff', brand: '#e36523', text: '#1e293b', muted: '#64748b', hairline: '#e2e8f0' };

function FieldLabel({ children }: { children: string }) {
  return <Text style={{ fontSize: 12, fontWeight: '700', color: C.muted, marginBottom: 6, textAlign: 'right', letterSpacing: 0.4 }}>{children}</Text>;
}

export default function EditProductScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id, page: pageParam } = useLocalSearchParams<{ id: string; page?: string }>();
  const locale = getCurrentLocale();
  const [notifyingStock, setNotifyingStock] = useState(false);

  const { data: product, isLoading } = useProduct(id);
  const updateMutation = useUpdateProduct(id);
  const { data: categories } = useCategories(false);
  const { data: brands } = useBrands(false);
  const { images, addImage, removeImage, setPrimary } = useProductImages(id);
  const { data: stockAlertCount = 0 } = useStockAlertSubscriberCount(id);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('الصلاحيات', 'يلزم السماح بالوصول إلى مكتبة الصور');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (result.canceled) return;
    for (const asset of result.assets) {
      try {
        await addImage.mutateAsync({ uri: asset.uri, mimeType: asset.mimeType ?? undefined });
      } catch (e) {
        Alert.alert('خطأ', (e as Error).message ?? 'فشل رفع الصورة');
      }
    }
  }

  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name_ar: '',
      name_en: '',
      brand_id: '',
      description_ar: '',
      description_en: '',
      price: '',
      discount_price: '',
      category_id: '',
      stock_quantity: '0',
      is_available: true,
      is_featured: false,
      weight: '',
      weight_unit: '',
      unit_type: undefined,
      price_per_piece: '',
      price_per_carton: '',
      price_per_kg: '',
      pieces_per_carton: '',
      flash_sale_price: '',
      flash_sale_ends_at: '',
    },
  });

  useEffect(() => {
    if (!product) return;
    reset({
      name_ar: product.name_ar ?? '',
      name_en: product.name_en ?? '',
      brand_id: product.brand_id ?? '',
      description_ar: product.description_ar ?? '',
      description_en: product.description_en ?? '',
      price: String(product.price ?? ''),
      discount_price: product.discount_price != null ? String(product.discount_price) : '',
      category_id: product.category_id ?? '',
      stock_quantity: String(product.stock_quantity ?? 0),
      is_available: product.is_available ?? true,
      is_featured: product.is_featured ?? false,
      weight: product.weight != null ? String(product.weight) : '',
      weight_unit: product.weight_unit ?? '',
      unit_type: (product.unit_type as 'piece' | 'kg' | 'carton') ?? undefined,
      price_per_piece: product.price_per_piece != null ? String(product.price_per_piece) : '',
      price_per_carton: product.price_per_carton != null ? String(product.price_per_carton) : '',
      price_per_kg: product.price_per_kg != null ? String(product.price_per_kg) : '',
      pieces_per_carton: product.pieces_per_carton != null ? String(product.pieces_per_carton) : '',
      flash_sale_price: product.flash_sale_price != null ? String(product.flash_sale_price) : '',
      flash_sale_ends_at: product.flash_sale_ends_at
        ? new Date(product.flash_sale_ends_at).toISOString().slice(0, 16).replace('T', ' ')
        : '',
    });
  }, [product]);

  async function onSubmit(values: ProductFormValues) {
    let flashEndsAt: string | null = null;
    if (values.flash_sale_ends_at && values.flash_sale_ends_at.trim()) {
      const parsed = new Date(values.flash_sale_ends_at.trim().replace(' ', 'T'));
      if (!isNaN(parsed.getTime())) flashEndsAt = parsed.toISOString();
    }

    await updateMutation.mutateAsync({
      name_ar: values.name_ar,
      name_en: values.name_en || null,
      brand_id: values.brand_id || null,
      description_ar: values.description_ar || null,
      description_en: values.description_en || null,
      price: parseFloat(values.price),
      discount_price: values.discount_price ? parseFloat(values.discount_price) : null,
      category_id: values.category_id,
      stock_quantity: parseInt(values.stock_quantity),
      is_available: values.is_available,
      is_featured: values.is_featured,
      weight: values.weight ? parseFloat(values.weight) : null,
      weight_unit: values.weight_unit || null,
      unit_type: values.unit_type ?? null,
      price_per_piece: values.price_per_piece ? parseFloat(values.price_per_piece) : null,
      price_per_carton: values.price_per_carton ? parseFloat(values.price_per_carton) : null,
      price_per_kg: values.price_per_kg ? parseFloat(values.price_per_kg) : null,
      pieces_per_carton: values.pieces_per_carton ? parseInt(values.pieces_per_carton) : null,
      flash_sale_price: values.flash_sale_price ? parseFloat(values.flash_sale_price) : null,
      flash_sale_ends_at: flashEndsAt,
    } as Parameters<typeof updateMutation.mutateAsync>[0]);
    const returnPage = pageParam ? parseInt(pageParam, 10) : 0;
    router.replace(`/(admin)/products?page=${returnPage}` as any);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.brand} />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="cube-outline" size={48} color="#cbd5e1" />
        <Text style={{ color: C.muted, fontSize: 16, marginTop: 12 }}>المنتج غير موجود</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }}>
      {/* ── Header ── */}
      <View style={{
        backgroundColor: C.card, paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: C.hairline,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <TouchableOpacity
          onPress={() => {
            const returnPage = pageParam ? parseInt(pageParam, 10) : 0;
            router.replace(`/(admin)/products?page=${returnPage}` as any);
          }}
          style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="close" size={20} color={C.muted} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center', flex: 1, marginHorizontal: 8 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: C.text }} numberOfLines={1}>{product.name_ar}</Text>
          <Text style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>تعديل المنتج</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 16 }} keyboardShouldPersistTaps="handled">

        {/* ── Error banner ── */}
        {updateMutation.error && (
          <View style={{ backgroundColor: '#fef2f2', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#fecaca', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="alert-circle" size={16} color="#dc2626" />
            <Text style={{ fontSize: 13, color: '#dc2626', flex: 1, textAlign: 'right' }}>{(updateMutation.error as Error).message}</Text>
          </View>
        )}

        {/* ── Images ── */}
        <View style={{ backgroundColor: C.card, borderRadius: 18, padding: 16, gap: 10 }}>
          <FieldLabel>صور المنتج</FieldLabel>
          {addImage.error && (
            <Text style={{ color: '#dc2626', fontSize: 12, textAlign: 'right' }}>{(addImage.error as Error).message}</Text>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {images.data?.map((img) => (
              <View key={img.id} style={{ position: 'relative' }}>
                <TouchableOpacity onPress={() => setPrimary.mutate(img.id)} activeOpacity={0.85}>
                  <Image
                    source={{ uri: img.url }}
                    style={{
                      width: 90, height: 90, borderRadius: 14,
                      borderWidth: img.is_primary ? 2.5 : 1.5,
                      borderColor: img.is_primary ? C.brand : C.hairline,
                    }}
                    contentFit="cover"
                  />
                </TouchableOpacity>
                {img.is_primary && (
                  <View style={{
                    position: 'absolute', bottom: 4, left: 4,
                    backgroundColor: C.brand, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2,
                  }}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>رئيسية</Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      if (window.confirm('هل تريد حذف هذه الصورة؟')) removeImage.mutate(img);
                      return;
                    }
                    Alert.alert('حذف الصورة', 'هل تريد حذف هذه الصورة؟', [
                      { text: 'إلغاء', style: 'cancel' },
                      { text: 'حذف', style: 'destructive', onPress: () => removeImage.mutate(img) },
                    ]);
                  }}
                  style={{
                    position: 'absolute', top: -6, right: -6,
                    backgroundColor: '#dc2626', borderRadius: 10, width: 20, height: 20,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Ionicons name="close" size={11} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              onPress={pickImage}
              disabled={addImage.isPending}
              style={{
                width: 90, height: 90, borderRadius: 14,
                borderWidth: 2, borderStyle: 'dashed', borderColor: C.brand,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#fff7ed',
              }}
            >
              {addImage.isPending ? (
                <ActivityIndicator color={C.brand} size="small" />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={24} color={C.brand} />
                  <Text style={{ color: C.brand, fontSize: 10, fontWeight: '700', marginTop: 4 }}>إضافة</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ── Basic info ── */}
        <View style={{ backgroundColor: C.card, borderRadius: 18, padding: 16, gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: C.text, textAlign: 'right', marginBottom: 4 }}>المعلومات الأساسية</Text>
          <Controller control={control} name="name_ar"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input label="الاسم بالعربية *" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name_ar?.message} />
            )}
          />
          <Controller control={control} name="name_en"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input label="Name in English" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} error={errors.name_en?.message} />
            )}
          />
          <Controller control={control} name="description_ar"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input label="الوصف" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} multiline numberOfLines={3} />
            )}
          />
        </View>

        {/* ── Brand picker ── */}
        <View style={{ backgroundColor: C.card, borderRadius: 18, padding: 16, gap: 10 }}>
          <FieldLabel>الماركة</FieldLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {brands?.map((brand) => {
              const selected = watch('brand_id') === brand.id;
              return (
                <TouchableOpacity
                  key={brand.id}
                  onPress={() => setValue('brand_id', selected ? '' : brand.id)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                    backgroundColor: selected ? C.brand : '#f1f5f9',
                    borderWidth: 1.5, borderColor: selected ? C.brand : C.hairline,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? '#fff' : C.text }}>
                    {brand.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.brand_id && <Text style={{ fontSize: 12, color: '#ef4444', textAlign: 'right' }}>{errors.brand_id.message}</Text>}
        </View>

        {/* ── Category picker ── */}
        <View style={{ backgroundColor: C.card, borderRadius: 18, padding: 16, gap: 10 }}>
          <FieldLabel>الفئة *</FieldLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {categories?.map((cat) => {
              const selected = watch('category_id') === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setValue('category_id', cat.id)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                    backgroundColor: selected ? C.brand : '#f1f5f9',
                    borderWidth: 1.5, borderColor: selected ? C.brand : C.hairline,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? '#fff' : C.text }}>
                    {getCategoryName(cat, locale)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.category_id && <Text style={{ fontSize: 12, color: '#ef4444', textAlign: 'right' }}>{errors.category_id.message}</Text>}
        </View>

        {/* ── Pricing ── */}
        <View style={{ backgroundColor: C.card, borderRadius: 18, padding: 16, gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: C.text, textAlign: 'right', marginBottom: 4 }}>التسعير والمخزون</Text>
          <Controller control={control} name="price"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input label="السعر (د.أ) *" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="decimal-pad" error={errors.price?.message} />
            )}
          />
          <Controller control={control} name="discount_price"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input label="سعر الخصم (اختياري)" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} keyboardType="decimal-pad" error={errors.discount_price?.message} />
            )}
          />
          <Controller control={control} name="stock_quantity"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input label="الكمية المتاحة *" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="number-pad" error={errors.stock_quantity?.message} />
            )}
          />
        </View>

        {/* ── Weight ── */}
        <View style={{ backgroundColor: C.card, borderRadius: 18, padding: 16, gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: C.text, textAlign: 'right', marginBottom: 4 }}>الوزن</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 2 }}>
              <Controller control={control} name="weight"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input label="الوزن" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} keyboardType="decimal-pad" placeholder="مثال: 0.5" error={errors.weight?.message} />
                )}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Controller control={control} name="weight_unit"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input label="الوحدة" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} placeholder="كغ / غ" error={errors.weight_unit?.message} />
                )}
              />
            </View>
          </View>
        </View>

        {/* ── Unit pricing ── */}
        <View style={{ backgroundColor: C.card, borderRadius: 18, padding: 16, gap: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: C.text, textAlign: 'right', marginBottom: 4 }}>وحدات البيع</Text>
          {([
            { key: 'price_per_piece' as const,  icon: '🔢', label: 'بالحبة',   priceLabel: 'سعر الحبة (د.أ)' },
            { key: 'price_per_kg' as const,     icon: '⚖️', label: 'بالكيلو',  priceLabel: 'سعر الكيلو (د.أ)' },
            { key: 'price_per_carton' as const, icon: '📦', label: 'بالكرتون', priceLabel: 'سعر الكرتون (د.أ)' },
          ]).map(({ key, icon, label, priceLabel }) => {
            const isEnabled = !!(watch(key));
            return (
              <View key={key} style={{
                borderWidth: 1.5,
                borderColor: isEnabled ? C.brand : C.hairline,
                borderRadius: 14,
                backgroundColor: isEnabled ? '#fff7ed' : '#f8fafc',
                overflow: 'hidden',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 }}>
                  <Switch
                    value={isEnabled}
                    onValueChange={(v) => {
                      if (!v) setValue(key, '');
                      else setValue(key, '0');
                    }}
                    trackColor={{ true: C.brand, false: '#e2e8f0' }}
                  />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{icon} {label}</Text>
                </View>
                {isEnabled && (
                  <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                    <Controller control={control} name={key}
                      render={({ field: { onChange, value, onBlur } }) => (
                        <Input label={priceLabel} value={value ?? ''} onChangeText={onChange} onBlur={onBlur} keyboardType="decimal-pad" error={(errors as any)[key]?.message} />
                      )}
                    />
                    {key === 'price_per_carton' && (
                      <Controller control={control} name="pieces_per_carton"
                        render={({ field: { onChange, value, onBlur } }) => (
                          <Input label="عدد الحبات في الكرتون" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} keyboardType="number-pad" />
                        )}
                      />
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ── Toggles ── */}
        <View style={{ backgroundColor: C.card, borderRadius: 18, padding: 16 }}>
          <Controller control={control} name="is_available"
            render={({ field: { onChange, value } }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.hairline }}>
                <Switch value={value} onValueChange={onChange} trackColor={{ true: C.brand, false: '#e2e8f0' }} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>متوفر للبيع</Text>
              </View>
            )}
          />
          <Controller control={control} name="is_featured"
            render={({ field: { onChange, value } }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
                <Switch value={value} onValueChange={onChange} trackColor={{ true: C.brand, false: '#e2e8f0' }} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>منتج مميز</Text>
              </View>
            )}
          />
        </View>

        {/* ── Flash Sale ── */}
        <View style={{
          borderWidth: 2, borderColor: '#fed7aa', borderRadius: 18,
          backgroundColor: '#fff7ed', overflow: 'hidden',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12 }}>
            <Text style={{ fontSize: 18 }}>⚡</Text>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#ea580c' }}>عرض فلاش</Text>
          </View>
          <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 0 }}>
            <Controller control={control} name="flash_sale_price"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input label="سعر الفلاش (د.أ)" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} keyboardType="decimal-pad" placeholder="مثال: 1.500" error={(errors as any).flash_sale_price?.message} />
              )}
            />
            <Controller control={control} name="flash_sale_ends_at"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input label="تاريخ انتهاء العرض (YYYY-MM-DD HH:MM)" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} placeholder="2025-12-31 23:59" error={(errors as any).flash_sale_ends_at?.message} />
              )}
            />
            {(watch('flash_sale_price') || watch('flash_sale_ends_at')) ? (
              <TouchableOpacity
                onPress={() => { setValue('flash_sale_price', ''); setValue('flash_sale_ends_at', ''); }}
                style={{ alignSelf: 'flex-end', paddingVertical: 4, paddingHorizontal: 10 }}
              >
                <Text style={{ fontSize: 12, color: '#dc2626', fontWeight: '700' }}>إلغاء الفلاش سيل ✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* ── Stock Alerts ── */}
        <View style={{
          borderWidth: 1.5, borderColor: '#e0e7ff', borderRadius: 18,
          backgroundColor: '#eef2ff', paddingHorizontal: 16, paddingVertical: 14,
        }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#4338ca', marginBottom: 8, textAlign: 'right' }}>
            🔔 إشعارات توفر المنتج
          </Text>
          <Text style={{ fontSize: 13, color: C.muted, marginBottom: 12, textAlign: 'right' }}>
            {stockAlertCount > 0
              ? `يوجد ${stockAlertCount} مستخدم ينتظر توفر هذا المنتج`
              : 'لا يوجد مستخدمون ينتظرون توفر هذا المنتج حالياً'}
          </Text>
          {stockAlertCount > 0 && (
            <TouchableOpacity
              onPress={async () => {
                setNotifyingStock(true);
                try {
                  const sent = await sendStockAvailableNotifications(id!, product!.name_ar);
                  Alert.alert('تم الإرسال', `تم إشعار ${sent} مستخدم بتوفر المنتج`);
                } catch (e) {
                  Alert.alert('خطأ', (e as Error).message ?? 'فشل الإرسال');
                } finally {
                  setNotifyingStock(false);
                }
              }}
              disabled={notifyingStock}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                backgroundColor: '#4338ca', borderRadius: 14, paddingVertical: 12,
                opacity: notifyingStock ? 0.6 : 1,
              }}
            >
              {notifyingStock ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={{ fontSize: 16 }}>📢</Text>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>إشعار المشتركين</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={updateMutation.isPending}
          style={{
            backgroundColor: updateMutation.isPending ? '#e2e8f0' : C.brand,
            borderRadius: 16, paddingVertical: 16,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            shadowColor: C.brand, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
          }}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator color="#94a3b8" size="small" />
          ) : (
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          )}
          <Text style={{ color: updateMutation.isPending ? '#94a3b8' : '#fff', fontWeight: '800', fontSize: 15 }}>
            {updateMutation.isPending ? 'جارٍ الحفظ...' : t('common.save')}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
