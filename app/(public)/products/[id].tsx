import {
  View, Text, ScrollView, TouchableOpacity, Dimensions,
  FlatList, ActivityIndicator, Animated, Easing, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProduct, useProductsPage } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';
import { useToastStore } from '@/stores/toastStore';
import { getCurrentLocale } from '@/i18n';
import { getProductName, getProductDescription, hasDiscount } from '@/types/models';
import { formatPrice, getDiscountPercent } from '@/utils/formatPrice';
import { ProductCard } from '@/components/product/ProductCard';
import { useFavoriteIds, useToggleFavorite } from '@/hooks/useFavorites';
import { useAuthStore } from '@/stores/authStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BRAND = '#e36523';

// ─── Image gallery ─────────────────────────────────────────────────────────────
function ImageGallery({
  images,
  discounted,
  originalPrice,
  discountPrice,
}: {
  images: { id: string; url: string }[];
  discounted: boolean;
  originalPrice: number;
  discountPrice?: number;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList<any>>(null);
  const imgs = images.length > 0 ? images : [{ id: '__placeholder__', url: '' }];

  return (
    <View>
      {/* Main swipeable image */}
      <FlatList
        ref={flatRef}
        data={imgs}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{
            width: SCREEN_WIDTH, height: 320,
            backgroundColor: '#f9f7f5',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Image
              source={{ uri: item.url }}
              style={{ width: SCREEN_WIDTH * 0.82, height: 280, borderRadius: 0 }}
              contentFit="contain"
            />
          </View>
        )}
        onMomentumScrollEnd={(e) =>
          setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))
        }
      />

      {/* Discount badge */}
      {discounted && discountPrice != null && (
        <View style={{
          position: 'absolute', top: 60, left: 16,
          backgroundColor: '#ef4444', borderRadius: 12,
          paddingHorizontal: 10, paddingVertical: 5,
        }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>
            -{getDiscountPercent(originalPrice, discountPrice)}%
          </Text>
        </View>
      )}

      {/* Dot pagination */}
      {imgs.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 }}>
          {imgs.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                flatRef.current?.scrollToIndex({ index: i, animated: true });
                setActiveIndex(i);
              }}
              style={{
                width: i === activeIndex ? 20 : 6, height: 6, borderRadius: 3,
                backgroundColor: i === activeIndex ? BRAND : '#d1c9bf',
              }}
            />
          ))}
        </View>
      )}

      {/* Thumbnail strip */}
      {imgs.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 10, backgroundColor: '#f9fafb', borderTopWidth: 1, borderTopColor: '#f3f4f6' }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
        >
          {imgs.map((img, i) => (
            <TouchableOpacity
              key={img.id}
              onPress={() => {
                flatRef.current?.scrollToIndex({ index: i, animated: true });
                setActiveIndex(i);
              }}
            >
              <Image
                source={{ uri: img.url }}
                style={{
                  width: 56, height: 56, borderRadius: 10,
                  borderWidth: i === activeIndex ? 2.5 : 1,
                  borderColor: i === activeIndex ? BRAND : '#e6e0d8',
                  opacity: i === activeIndex ? 1 : 0.6,
                }}
                contentFit="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Wishlist button ──────────────────────────────────────────────────────────
function WishlistButton({ productId }: { productId: string }) {
  const { session } = useAuthStore();
  const { data: favIds } = useFavoriteIds();
  const toggleFav = useToggleFavorite();
  const isFav = favIds?.includes(productId) ?? false;
  const scale = useRef(new Animated.Value(1)).current;

  function toggle() {
    if (!session?.user?.id) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.35, duration: 120, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    toggleFav.mutate({ productId, isFavorited: isFav });
  }

  if (!session) return null;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={toggle}
        style={{
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: isFav ? '#fef2f2' : 'rgba(255,255,255,0.95)',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
        }}
        activeOpacity={0.75}
      >
        <Text style={{ fontSize: 18 }}>{isFav ? '❤️' : '🤍'}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Animated add-to-cart button ──────────────────────────────────────────────
function AddToCartButton({
  onPress, outOfStock, disabled, totalPrice,
}: { onPress: () => void; outOfStock: boolean; disabled?: boolean; totalPrice: string }) {
  const [added, setAdded] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  function handlePress() {
    if (outOfStock || disabled) return;
    onPress();
    setAdded(true);
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <Animated.View style={{ flex: 2, transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={outOfStock || !!disabled}
        activeOpacity={0.85}
        style={{
          backgroundColor: outOfStock ? '#d1d5db' : added ? '#16a34a' : BRAND,
          borderRadius: 18, paddingVertical: 17,
          alignItems: 'center', justifyContent: 'center',
          flexDirection: 'row', gap: 8,
          shadowColor: outOfStock ? 'transparent' : added ? '#16a34a' : BRAND,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
        }}
      >
        <Text style={{ fontSize: 18 }}>{outOfStock ? '🚫' : added ? '✓' : '🛒'}</Text>
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>
          {outOfStock ? 'نفدت الكمية' : added ? 'تمت الإضافة!' : 'أضف للسلة'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: product, isLoading, error } = useProduct(id ?? '');
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(customer)/home');
  }
  const locale = getCurrentLocale();
  const { addItem } = useCart();
  const showToast = useToastStore((s) => s.show);
  const [quantity, setQuantity] = useState(1);
  const [selectedUnit, setSelectedUnit] = useState<'piece' | 'kg' | 'carton' | null>(null);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={BRAND} />
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

  const name        = getProductName(product, locale);
  const description = getProductDescription(product, locale);
  const discounted  = hasDiscount(product);
  const images      = product.images?.length ? product.images : (product.product_images ?? []);
  const outOfStock  = product.stock_quantity === 0;

  // Unit options
  const unitOptions: { unit: 'piece' | 'kg' | 'carton'; label: string; price: number }[] = [];
  if (product.price_per_piece != null)   unitOptions.push({ unit: 'piece',  label: 'بالحبة',   price: product.price_per_piece });
  if (product.price_per_kg != null)      unitOptions.push({ unit: 'kg',     label: 'بالكيلو',  price: product.price_per_kg });
  if (product.price_per_carton != null)  unitOptions.push({
    unit: 'carton',
    label: product.pieces_per_carton ? `بالكرتون (${product.pieces_per_carton} حبة)` : 'بالكرتون',
    price: product.price_per_carton,
  });
  const hasUnitOptions = unitOptions.length > 0;
  const effectiveUnit  = selectedUnit ?? (unitOptions[0]?.unit ?? null) as 'piece' | 'kg' | 'carton' | null;
  const displayPrice   = hasUnitOptions
    ? (unitOptions.find((o) => o.unit === effectiveUnit)?.price ?? product.price)
    : (discounted ? product.discount_price! : product.price);

  function handleAddToCart() {
    if (outOfStock) return;
    addItem({
      id: '',
      cart_id: '',
      product_id: product!.id,
      quantity,
      selected_unit: effectiveUnit,
      product: product!,
    });
    showToast(`تمت إضافة ${name} إلى السلة`);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', direction: 'rtl' as any }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image gallery */}
        <View style={{ position: 'relative' }}>
          <ImageGallery
            images={images}
            discounted={discounted}
            originalPrice={product.price}
            discountPrice={product.discount_price ?? undefined}
          />

          {/* Back button */}
          <View style={{
            position: 'absolute', top: (insets.top || 0) + 10, right: 16,
            flexDirection: 'row', gap: 8,
          }}>
            <TouchableOpacity
              onPress={goBack}
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.95)',
                alignItems: 'center', justifyContent: 'center',
                shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
              }}
            >
              <Text style={{ fontSize: 18, color: '#374151' }}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.replace('/(customer)/home')}
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.95)',
                alignItems: 'center', justifyContent: 'center',
                shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
              }}
            >
              <Text style={{ fontSize: 18 }}>🏠</Text>
            </TouchableOpacity>
          </View>

          {/* Wishlist button — top left */}
          <View style={{
            position: 'absolute', top: (insets.top || 0) + 10, left: 16,
          }}>
            <WishlistButton productId={product.id} />
          </View>
        </View>

        {/* ── Product info ── */}
        <View style={{ padding: 20, direction: 'rtl' as any }}>
          {/* Name */}
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#111827', lineHeight: 32, textAlign: 'right' }}>
            {name}
          </Text>

          {/* Price row */}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 10, gap: 10 }}>
            <Text style={{ fontSize: 28, fontWeight: '900', color: BRAND }}>
              {formatPrice(displayPrice)}
            </Text>
            {!hasUnitOptions && discounted && (
              <Text style={{ fontSize: 16, color: '#c9bfb6', textDecorationLine: 'line-through' }}>
                {formatPrice(product.price)}
              </Text>
            )}
          </View>

          {/* Unit selector */}
          {hasUnitOptions && !outOfStock && (
            <View style={{ marginTop: 18, marginBottom: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#374151', marginBottom: 10, textAlign: 'right' }}>
                اختر الوحدة
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {unitOptions.map((opt) => {
                  const active = effectiveUnit === opt.unit;
                  return (
                    <TouchableOpacity
                      key={opt.unit}
                      onPress={() => setSelectedUnit(opt.unit)}
                      style={{
                        flex: 1, minWidth: 90,
                        borderRadius: 16, borderWidth: 2,
                        borderColor: active ? BRAND : '#e6e0d8',
                        backgroundColor: active ? '#fff7ed' : '#f9f7f5',
                        paddingVertical: 14, alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '800', color: active ? BRAND : '#857d78' }}>
                        {opt.label}
                      </Text>
                      <Text style={{ fontSize: 17, fontWeight: '900', color: active ? BRAND : '#1c1917', marginTop: 5 }}>
                        {formatPrice(opt.price)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Stock + weight row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 16, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: outOfStock ? '#ef4444' : '#22c55e',
              }} />
              <Text style={{ fontSize: 13, color: outOfStock ? '#ef4444' : '#16a34a', fontWeight: '700' }}>
                {outOfStock ? 'نفد المخزون' : `متوفر (${product.stock_quantity})`}
              </Text>
            </View>
            {product.weight != null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 12, color: '#9ca3af' }}>⚖️</Text>
                <Text style={{ fontSize: 13, color: '#6b7280', fontWeight: '500' }}>
                  {product.weight} {product.weight_unit ?? 'كغ'}
                </Text>
              </View>
            )}
          </View>

          <View style={{ height: 1, backgroundColor: '#f3f4f6', marginVertical: 18 }} />

          {/* Description */}
          {description && (
            <Text style={{ fontSize: 15, color: '#4b5563', lineHeight: 26, marginBottom: 24, textAlign: 'right' }}>
              {description}
            </Text>
          )}

          {/* Quantity stepper */}
          {!outOfStock && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151' }}>الكمية</Text>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 0,
                backgroundColor: '#f9f7f5', borderRadius: 18, borderWidth: 1.5, borderColor: '#e6e0d8',
                overflow: 'hidden',
              }}>
                <TouchableOpacity
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: quantity === 1 ? '#f3f4f6' : '#fff7ed' }}
                >
                  <Text style={{ fontSize: 18, fontWeight: '700', color: quantity === 1 ? '#c9bfb6' : BRAND }}>−</Text>
                </TouchableOpacity>
                <Text style={{ minWidth: 44, textAlign: 'center', fontSize: 17, fontWeight: '900', color: '#111827' }}>
                  {quantity}
                </Text>
                <TouchableOpacity
                  onPress={() => setQuantity((q) => Math.min(product.stock_quantity ?? 99, q + 1))}
                  style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff7ed' }}
                >
                  <Text style={{ fontSize: 18, fontWeight: '700', color: BRAND }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Product meta chips */}
          {(product.sku || product.barcode) && (
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {product.sku && (
                <View style={{ backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 11, color: '#6b7280' }}>SKU: {product.sku}</Text>
                </View>
              )}
              {product.barcode && (
                <View style={{ backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 11, color: '#6b7280' }}>Barcode: {product.barcode}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Similar products */}
        <SimilarProducts categoryId={product.category_id} currentProductId={product.id} locale={locale} />

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Sticky footer ── */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff',
        paddingHorizontal: 16, paddingTop: 14,
        paddingBottom: (insets.bottom || 0) + 12,
        borderTopWidth: 1, borderTopColor: '#f3f4f6',
        shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 14,
        flexDirection: 'row', gap: 14, alignItems: 'center',
        direction: 'rtl' as any,
      }}>
        {/* Price summary */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: '#9ca3af' }}>الإجمالي</Text>
          <Text style={{ fontSize: 22, fontWeight: '900', color: BRAND, lineHeight: 28 }}>
            {formatPrice(displayPrice * quantity)}
          </Text>
          {hasUnitOptions && effectiveUnit && (
            <Text style={{ fontSize: 11, color: '#857d78' }}>
              {unitOptions.find((o) => o.unit === effectiveUnit)?.label}
            </Text>
          )}
        </View>

        <AddToCartButton
          onPress={handleAddToCart}
          outOfStock={outOfStock}
          totalPrice={formatPrice(displayPrice * quantity)}
        />
      </View>
    </View>
  );
}

// ─── Similar Products ─────────────────────────────────────────────────────────
function SimilarProducts({ categoryId, currentProductId, locale }: { categoryId: string; currentProductId: string; locale: string }) {
  const router = useRouter();
  const { data, isLoading } = useProductsPage({
    categoryId,
    availableOnly: true,
    sortBy: 'newest',
    limit: 10,
  });
  const products = (data?.data ?? []).filter((p) => p.id !== currentProductId);

  if (isLoading) {
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator color={BRAND} />
      </View>
    );
  }
  if (products.length === 0) return null;

  return (
    <View style={{ marginTop: 4, marginBottom: 8 }}>
      <View style={{ paddingHorizontal: 16, marginBottom: 12, direction: 'rtl' as any }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#1c1917', textAlign: 'right' }}>
          منتجات مشابهة
        </Text>
        <View style={{ width: 40, height: 3, backgroundColor: BRAND, borderRadius: 2, marginTop: 6 }} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12, flexDirection: 'row-reverse' }}
      >
        {products.map((item) => (
          <View key={item.id} style={{ width: 155 }}>
            <ProductCard product={item} onPress={() => router.push(`/(public)/products/${item.id}` as any)} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
