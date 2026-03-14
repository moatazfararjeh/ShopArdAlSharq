import { useEffect } from 'react';
import { View, Text, ScrollView, Switch, ActivityIndicator, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { productSchema, ProductFormValues } from '@/schemas/productSchema';
import { useProduct, useUpdateProduct } from '@/hooks/useProducts';
import { useProductImages } from '@/hooks/useProductImages';
import { useCategories } from '@/hooks/useCategories';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getCurrentLocale } from '@/i18n';
import { getCategoryName } from '@/types/models';

export default function EditProductScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const locale = getCurrentLocale();

  const { data: product, isLoading } = useProduct(id);
  const updateMutation = useUpdateProduct(id);
  const { data: categories } = useCategories(false);
  const { images, addImage, removeImage, setPrimary } = useProductImages(id);

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
        await addImage.mutateAsync(asset.uri);
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
    },
  });

  // Populate form once product loads
  useEffect(() => {
    if (!product) return;
    reset({
      name_ar: product.name_ar ?? '',
      name_en: product.name_en ?? '',
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
    });
  }, [product]);

  async function onSubmit(values: ProductFormValues) {
    await updateMutation.mutateAsync({
      name_ar: values.name_ar,
      name_en: values.name_en || null,
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
    } as Parameters<typeof updateMutation.mutateAsync>[0]);
    if (router.canGoBack()) router.back();
    else router.replace('/(admin)/products' as any);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f7f5', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#e36523" />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f7f5', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#857d78', fontSize: 16 }}>المنتج غير موجود</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f7f5' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#1c1917', marginBottom: 16 }}>
          {t('common.edit')}: {product.name_ar}
        </Text>

        {updateMutation.error && (
          <View style={{ marginBottom: 12, borderRadius: 12, backgroundColor: '#fef2f2', padding: 12 }}>
            <Text style={{ color: '#dc2626', fontSize: 13 }}>{(updateMutation.error as Error).message}</Text>
          </View>
        )}

        {/* ── Images section ── */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>صور المنتج</Text>
        {addImage.error && (
          <Text style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{(addImage.error as Error).message}</Text>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 20 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {images.data?.map((img) => (
            <View key={img.id} style={{ position: 'relative' }}>
              <TouchableOpacity
                onPress={() => setPrimary.mutate(img.id)}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: img.url }}
                  style={{
                    width: 90, height: 90, borderRadius: 10,
                    borderWidth: img.is_primary ? 2.5 : 1.5,
                    borderColor: img.is_primary ? '#e36523' : '#e6e0d8',
                  }}
                />
              </TouchableOpacity>
              {img.is_primary && (
                <View style={{
                  position: 'absolute', bottom: 4, left: 4,
                  backgroundColor: '#e36523', borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1,
                }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>رئيسية</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() =>
                  Alert.alert('حذف الصورة', 'هل تريد حذف هذه الصورة؟', [
                    { text: 'إلغاء', style: 'cancel' },
                    { text: 'حذف', style: 'destructive', onPress: () => removeImage.mutate(img) },
                  ])
                }
                style={{
                  position: 'absolute', top: -6, right: -6,
                  backgroundColor: '#dc2626', borderRadius: 10, width: 20, height: 20,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Add image button */}
          <TouchableOpacity
            onPress={pickImage}
            disabled={addImage.isPending}
            style={{
              width: 90, height: 90, borderRadius: 10,
              borderWidth: 2, borderStyle: 'dashed', borderColor: '#e36523',
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: '#fff8f5',
            }}
          >
            {addImage.isPending ? (
              <ActivityIndicator color="#e36523" size="small" />
            ) : (
              <Text style={{ color: '#e36523', fontSize: 32, lineHeight: 36 }}>+</Text>
            )}
          </TouchableOpacity>
        </ScrollView>

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

        {/* Unit section — one card per unit type, each independently toggleable */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>وحدات البيع</Text>
        {([
          { key: 'price_per_piece' as const,  icon: '🔢', label: 'بالحبة',   priceLabel: 'سعر الحبة (د.أ)' },
          { key: 'price_per_kg' as const,     icon: '⚖️', label: 'بالكيلو',  priceLabel: 'سعر الكيلو (د.أ)' },
          { key: 'price_per_carton' as const, icon: '📦', label: 'بالكرتون', priceLabel: 'سعر الكرتون (د.أ)' },
        ]).map(({ key, icon, label, priceLabel }) => {
          const isEnabled = !!(watch(key));
          return (
            <View key={key} style={{
              borderWidth: 1.5,
              borderColor: isEnabled ? '#e36523' : '#e6e0d8',
              borderRadius: 14, marginBottom: 10,
              backgroundColor: isEnabled ? '#fff8f5' : '#fafaf9',
              overflow: 'hidden',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1c1917' }}>{icon} {label}</Text>
                <Switch
                  value={isEnabled}
                  onValueChange={(v) => {
                    if (!v) setValue(key, '');
                    else setValue(key, '0');
                  }}
                  trackColor={{ true: '#e36523', false: '#e6e0d8' }}
                />
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

        {/* Category picker */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>الفئة *</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {categories?.map((cat) => {
            const selected = watch('category_id') === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setValue('category_id', cat.id)}
                style={{
                  paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                  backgroundColor: selected ? '#e36523' : '#ede8e1',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? '#fff' : '#1c1917' }}>
                  {getCategoryName(cat, locale)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {errors.category_id && (
          <Text style={{ color: '#dc2626', fontSize: 12, marginTop: -12, marginBottom: 12 }}>{errors.category_id.message}</Text>
        )}

        {/* Toggles */}
        <Controller control={control} name="is_available"
          render={({ field: { onChange, value } }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1c1917' }}>متوفر للبيع</Text>
              <Switch value={value} onValueChange={onChange} trackColor={{ true: '#e36523' }} />
            </View>
          )}
        />
        <Controller control={control} name="is_featured"
          render={({ field: { onChange, value } }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1c1917' }}>منتج مميز</Text>
              <Switch value={value} onValueChange={onChange} trackColor={{ true: '#e36523' }} />
            </View>
          )}
        />

        <Button
          title={t('common.save')}
          onPress={handleSubmit(onSubmit)}
          isLoading={updateMutation.isPending}
          fullWidth
          size="lg"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
