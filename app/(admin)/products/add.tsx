import { useState } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { productSchema, ProductFormValues } from '@/schemas/productSchema';
import { useCreateProduct } from '@/hooks/useProducts';
import { uploadProductImages } from '@/hooks/useProductImages';
import { useCategories } from '@/hooks/useCategories';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getCurrentLocale } from '@/i18n';
import { getCategoryName } from '@/types/models';

export default function AddProductScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = getCurrentLocale();
  const createMutation = useCreateProduct();
  const { data: categories } = useCategories(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

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
    if (!result.canceled) {
      setPendingImages((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  }

  function removeLocalImage(index: number) {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  }

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name_ar: '',
      name_en: '',
      description_ar: '',
      price: '',
      discount_price: '',
      category_id: '',
      stock_quantity: '0',
      is_available: true,
      is_featured: false,
      unit_type: undefined,
      price_per_piece: '',
      price_per_carton: '',
      price_per_kg: '',
      pieces_per_carton: '',
    },
  });

  async function onSubmit(values: ProductFormValues) {
    const newProduct = await createMutation.mutateAsync({
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
      slug: values.name_ar.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, ''),
    } as Parameters<typeof createMutation.mutateAsync>[0]);
    if (pendingImages.length > 0) {
      setUploadingImages(true);
      try {
        await uploadProductImages(newProduct.id, pendingImages);
      } finally {
        setUploadingImages(false);
      }
    }
    goBack();
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(admin)/products' as any);
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerClassName="p-4 pb-8" keyboardShouldPersistTaps="handled">
        <Text className="mb-4 text-xl font-bold">{t('admin.addProduct')}</Text>

        {createMutation.error && (
          <View className="mb-4 rounded-xl bg-red-50 p-3">
            <Text className="text-sm text-red-600">{(createMutation.error as Error).message}</Text>
          </View>
        )}

        {/* ── Images section ── */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>صور المنتج</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 20 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {pendingImages.map((uri, index) => (
            <View key={index} style={{ position: 'relative' }}>
              <Image
                source={{ uri }}
                style={{
                  width: 90, height: 90, borderRadius: 10,
                  borderWidth: index === 0 ? 2.5 : 1.5,
                  borderColor: index === 0 ? '#e36523' : '#e6e0d8',
                }}
              />
              {index === 0 && (
                <View style={{
                  position: 'absolute', bottom: 4, left: 4,
                  backgroundColor: '#e36523', borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1,
                }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>رئيسية</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => removeLocalImage(index)}
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

          <TouchableOpacity
            onPress={pickImage}
            style={{
              width: 90, height: 90, borderRadius: 10,
              borderWidth: 2, borderStyle: 'dashed', borderColor: '#e36523',
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: '#fff8f5',
            }}
          >
            <Text style={{ color: '#e36523', fontSize: 32, lineHeight: 36 }}>+</Text>
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
            <Input label="السعر (ريال) *" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="decimal-pad" error={errors.price?.message} />
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
          { key: 'price_per_piece' as const,  icon: '🔢', label: 'بالحبة',    priceLabel: 'سعر الحبة (د.أ)' },
          { key: 'price_per_kg' as const,     icon: '⚖️', label: 'بالكيلو',   priceLabel: 'سعر الكيلو (د.أ)' },
          { key: 'price_per_carton' as const, icon: '📦', label: 'بالكرتون',  priceLabel: 'سعر الكرتون (د.أ)' },
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
        <Text className="mb-1 text-sm font-medium text-gray-700">الفئة *</Text>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {categories?.map((cat) => {
            const selected = watch('category_id') === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setValue('category_id', cat.id)}
                className={['rounded-full px-4 py-2', selected ? 'bg-primary-500' : 'bg-gray-100'].join(' ')}
              >
                <Text className={['text-sm', selected ? 'text-white font-semibold' : 'text-gray-700'].join(' ')}>
                  {getCategoryName(cat, locale)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {errors.category_id && <Text className="-mt-3 mb-3 text-xs text-red-500">{errors.category_id.message}</Text>}

        {/* Toggles */}
        <Controller control={control} name="is_available"
          render={({ field: { onChange, value } }) => (
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-sm font-medium text-gray-700">متوفر للبيع</Text>
              <Switch value={value} onValueChange={onChange} trackColor={{ true: '#f97316' }} />
            </View>
          )}
        />
        <Controller control={control} name="is_featured"
          render={({ field: { onChange, value } }) => (
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-sm font-medium text-gray-700">منتج مميز</Text>
              <Switch value={value} onValueChange={onChange} trackColor={{ true: '#f97316' }} />
            </View>
          )}
        />

        <Button
          title={t('common.save')}
          onPress={handleSubmit(onSubmit)}
          isLoading={createMutation.isPending || uploadingImages}
          fullWidth size="lg"
        />
        {uploadingImages && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, gap: 8 }}>
            <ActivityIndicator color="#e36523" size="small" />
            <Text style={{ color: '#857d78', fontSize: 12 }}>جارٍ رفع الصور...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

