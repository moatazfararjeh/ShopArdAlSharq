import { View, Text, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProduct } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';
import { getCurrentLocale } from '@/i18n';
import { getProductName, getProductDescription, hasDiscount } from '@/types/models';
import { formatPrice, getDiscountPercent } from '@/utils/formatPrice';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: product, isLoading, error } = useProduct(id ?? '');
  const { t } = useTranslation();
  const router = useRouter();

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(customer)/home');
  }
  const locale = getCurrentLocale();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedUnit, setSelectedUnit] = useState<'piece' | 'kg' | 'carton' | null>(null);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <Text style={{ color: '#9ca3af' }}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <Text style={{ color: '#ef4444' }}>{t('errors.notFound')}</Text>
      </View>
    );
  }

  const name = getProductName(product, locale);
  const description = getProductDescription(product, locale);
  const discounted = hasDiscount(product);
  const images = product.images?.length ? product.images : (product.product_images ?? []);
  const currentImage = images[activeImageIndex]?.url;
  const outOfStock = product.stock_quantity === 0;

  const UNIT_LABELS: Record<string, string> = {
    piece: 'بالحبة',
    kg: 'بالكيلو',
    carton: 'بالكرتون',
  };

  // Build the available unit options for this product
  const unitOptions: { unit: 'piece' | 'kg' | 'carton'; label: string; price: number }[] = [];
  if (product.price_per_piece != null) {
    unitOptions.push({ unit: 'piece', label: 'بالحبة', price: product.price_per_piece });
  }
  if (product.price_per_kg != null) {
    unitOptions.push({ unit: 'kg', label: 'بالكيلو', price: product.price_per_kg });
  }
  if (product.price_per_carton != null) {
    unitOptions.push({
      unit: 'carton',
      label: product.pieces_per_carton ? `بالكرتون (${product.pieces_per_carton} حبة)` : 'بالكرتون',
      price: product.price_per_carton,
    });
  }
  const hasUnitOptions = unitOptions.length > 0;
  // Default to first option if not yet selected
  const effectiveUnit = selectedUnit ?? (unitOptions[0]?.unit ?? null) as 'piece' | 'kg' | 'carton' | null;
  const displayPrice = hasUnitOptions
    ? (unitOptions.find((o) => o.unit === effectiveUnit)?.price ?? product.price)
    : (discounted ? product.discount_price! : product.price);

  function handleAddToCart() {
    if (outOfStock) return;
    if (hasUnitOptions && effectiveUnit === null) {
      Alert.alert('اختر الوحدة', 'يرجى اختيار نوع الوحدة قبل الإضافة للسلة');
      return;
    }
    addItem({
      id: '',
      cart_id: '',
      product_id: product!.id,
      quantity,
      selected_unit: effectiveUnit,
      product: product!,
    });
    Alert.alert('✓ تمت الإضافة', t('products.addedToCart'));
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero image */}
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: currentImage }}
            style={{ width: SCREEN_WIDTH, height: 320 }}
            contentFit="cover"
          />
          {/* Back button */}
          <TouchableOpacity
            onPress={() => goBack()}
            style={{
              position: 'absolute', top: 50, left: 16,
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.95)',
              alignItems: 'center', justifyContent: 'center',
              shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
            }}
          >
            <Text style={{ fontSize: 18, color: '#374151' }}>←</Text>
          </TouchableOpacity>
          {/* Discount badge */}
          {discounted && (
            <View style={{
              position: 'absolute', top: 50, right: 16,
              backgroundColor: '#ef4444', borderRadius: 12,
              paddingHorizontal: 10, paddingVertical: 4,
            }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>
                -{getDiscountPercent(product.price, product.discount_price!)}%
              </Text>
            </View>
          )}
        </View>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
          >
            {images.map((img, i) => (
              <TouchableOpacity key={img.id} onPress={() => setActiveImageIndex(i)}>
                <Image
                  source={{ uri: img.url }}
                  style={{
                    width: 64, height: 64, borderRadius: 12,
                    borderWidth: i === activeImageIndex ? 2.5 : 0,
                    borderColor: '#f97316',
                    opacity: i === activeImageIndex ? 1 : 0.65,
                  }}
                  contentFit="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Content */}
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', lineHeight: 30 }}>
            {name}
          </Text>

          {/* Price */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 }}>
            <Text style={{ fontSize: 26, fontWeight: '900', color: '#f97316' }}>
              {formatPrice(displayPrice)}
            </Text>
            {!hasUnitOptions && discounted && (
              <Text style={{ fontSize: 16, color: '#9ca3af', textDecorationLine: 'line-through' }}>
                {formatPrice(product.price)}
              </Text>
            )}
          </View>

          {/* Unit selector — shown when product has piece/carton prices */}
          {hasUnitOptions && !outOfStock && (
            <View style={{ marginTop: 16, marginBottom: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 }}>اختر الوحدة</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {unitOptions.map((opt) => {
                  const active = effectiveUnit === opt.unit;
                  return (
                    <TouchableOpacity
                      key={opt.unit}
                      onPress={() => setSelectedUnit(opt.unit)}
                      style={{
                        flex: 1, borderRadius: 14,
                        borderWidth: 2,
                        borderColor: active ? '#e36523' : '#e6e0d8',
                        backgroundColor: active ? '#fff0eb' : '#f9f7f5',
                        paddingVertical: 12, alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '800', color: active ? '#e36523' : '#857d78' }}>
                        {opt.label}
                      </Text>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: active ? '#e36523' : '#1c1917', marginTop: 4 }}>
                        {formatPrice(opt.price)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Stock indicator */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
            <View style={{
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: outOfStock ? '#ef4444' : '#22c55e',
            }} />
            <Text style={{ fontSize: 13, color: outOfStock ? '#ef4444' : '#16a34a', fontWeight: '600' }}>
              {outOfStock ? t('products.outOfStock') : `متوفر (${product.stock_quantity})`}
            </Text>
          </View>

          <View style={{ height: 1, backgroundColor: '#f3f4f6', marginVertical: 16 }} />

          {description && (
            <Text style={{ fontSize: 15, color: '#4b5563', lineHeight: 24, marginBottom: 20 }}>
              {description}
            </Text>
          )}

          {/* Quantity stepper */}
          {!outOfStock && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 16 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151' }}>
                {t('products.quantity')}
              </Text>
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 16, overflow: 'hidden',
              }}>
                <TouchableOpacity
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  style={{ paddingHorizontal: 18, paddingVertical: 10, backgroundColor: quantity === 1 ? '#f9fafb' : '#fff' }}
                >
                  <Text style={{ fontSize: 18, fontWeight: '700', color: quantity === 1 ? '#9ca3af' : '#374151' }}>−</Text>
                </TouchableOpacity>
                <Text style={{ minWidth: 36, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#111827' }}>
                  {quantity}
                </Text>
                <TouchableOpacity
                  onPress={() => setQuantity((q) => Math.min(product.stock_quantity ?? 99, q + 1))}
                  style={{ paddingHorizontal: 18, paddingVertical: 10 }}
                >
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#f97316' }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Sticky footer */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff',
        paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32,
        borderTopWidth: 1, borderTopColor: '#f3f4f6',
        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 12,
        flexDirection: 'row', gap: 12, alignItems: 'center',
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: '#9ca3af' }}>الإجمالي</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#f97316' }}>
            {formatPrice(displayPrice * quantity)}
          </Text>
          {hasUnitOptions && effectiveUnit && (
            <Text style={{ fontSize: 11, color: '#857d78', marginTop: 2 }}>
              {unitOptions.find((o) => o.unit === effectiveUnit)?.label}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={handleAddToCart}
          disabled={outOfStock}
          style={{
            flex: 2, backgroundColor: outOfStock ? '#d1d5db' : '#f97316',
            borderRadius: 16, paddingVertical: 16,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
            {outOfStock ? t('products.outOfStock') : t('products.addToCart')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
