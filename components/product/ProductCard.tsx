import { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '@/hooks/useCart';
import { useCartStore } from '@/stores/cartStore';
import { useFavoriteIds, useToggleFavorite } from '@/hooks/useFavorites';
import { useToastStore } from '@/stores/toastStore';
import { useRecordProductEvent } from '@/hooks/useAnalytics';
import { useAuthStore } from '@/stores/authStore';
import { Product } from '@/types/models';
import { getCurrentLocale } from '@/i18n';
import { getProductName, getMinOrderQuantity, hasDiscount } from '@/types/models';
import { getDiscountPercent } from '@/utils/formatPrice';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { COLORS } from '@/lib/theme';


// Warm neutral placeholder blurhash (beige/cream tone)
const PLACEHOLDER_HASH = 'L9Q9mH00?bRi~WIUM{j[00t6xu%L';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const locale        = getCurrentLocale();
  const { addItem, updateQuantity } = useCart();
  const cartItems     = useCartStore((s) => s.items);
  const cartQty       = cartItems.find((i) => i.product_id === product.id)?.quantity ?? 0;
  const { data: favoriteIds = [] } = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const showToast     = useToastStore((s) => s.show);
  const recordEvent   = useRecordProductEvent();
  const userId        = useAuthStore((s) => s.profile?.id);

  // ── Press-scale animation ──────────────────────────────────────────────────
  const scale = useRef(new Animated.Value(1)).current;
  function onPressIn() {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, tension: 300, friction: 15 }).start();
  }
  function onPressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 15 }).start();
  }

  const liked        = favoriteIds.includes(product.id);
  const name         = getProductName(product, locale);
  const mainImage    = (product.images?.[0] ?? product.product_images?.[0])?.url ?? product.categories?.image_url ?? undefined;
  const discounted   = hasDiscount(product);
  const outOfStock   = product.stock_quantity === 0;

  // Flash sale wins over regular discount
  const flashActive  = !!product.flash_sale_price && !!product.flash_sale_ends_at &&
                       new Date(product.flash_sale_ends_at) > new Date();
  const salePercent  = flashActive
    ? getDiscountPercent(product.price, product.flash_sale_price!)
    : discounted ? getDiscountPercent(product.price, product.discount_price!) : 0;
  const displayPrice = flashActive
    ? product.flash_sale_price!
    : discounted ? product.discount_price! : product.price;
  const priceNum     = Number(displayPrice).toFixed(3);

  const unitCount = [product.price_per_piece, product.price_per_kg, product.price_per_carton].filter(Boolean).length;

  function handleAddToCart() {
    if (outOfStock) return;
    recordEvent.mutate({ productId: product.id, eventType: 'add_to_cart', userId: userId ?? undefined });
    addItem({ id: '', cart_id: '', product_id: product.id, quantity: getMinOrderQuantity(product), selected_unit: null, product });
    showToast(`تمت إضافة ${name} إلى السلة`);
  }

  // "كرتونة · 24 حبة" / "كغ" / "350 غم" — tells the buyer exactly what one tap adds.
  const unitLine = (() => {
    if (product.unit_type === 'carton') {
      return product.pieces_per_carton ? `كرتونة · ${product.pieces_per_carton} حبة` : 'كرتونة';
    }
    if (product.unit_type === 'kg')  return 'بالكيلو';
    if (product.unit_type === 'tin') return 'تنكة';
    if (product.weight != null)      return `${product.weight} ${product.weight_unit ?? 'غم'}`;
    return product.unit_type === 'piece' ? 'حبة' : null;
  })();

  const minQty = getMinOrderQuantity(product);

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale }], direction: 'rtl' as any }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        style={{ flex: 1, gap: 6 }}
      >
        {/* ── Image tile ── */}
        <View style={{
          aspectRatio: 1.15, borderRadius: 16, overflow: 'hidden',
          backgroundColor: COLORS.surface, padding: 12,
        }}>
          <Image
            source={{ uri: mainImage }}
            accessibilityLabel={name}
            style={{ width: '100%', height: '100%', opacity: outOfStock ? 0.45 : 1 }}
            contentFit="contain"
            placeholder={{ blurhash: PLACEHOLDER_HASH }}
            transition={250}
          />

          {/* Discount / flash badge — top right */}
          {!outOfStock && salePercent > 0 && (
            <View style={{
              position: 'absolute', top: 8, right: 8,
              backgroundColor: flashActive ? COLORS.brandFill : COLORS.green,
              borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2,
            }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                {flashActive ? '⚡ ' : ''}−{salePercent}%
              </Text>
            </View>
          )}

          {/* Heart — top left */}
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); toggleFavorite.mutate({ productId: product.id, isFavorited: liked }); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={liked ? 'إزالة من المفضلة' : 'أضف للمفضلة'}
            style={{
              position: 'absolute', top: 6, left: 6,
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.9)',
              alignItems: 'center', justifyContent: 'center',
            }}
            activeOpacity={0.75}
          >
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={17} color={liked ? COLORS.danger : COLORS.muted} />
          </TouchableOpacity>

          {/* Out of stock strip */}
          {outOfStock && (
            <View style={{
              position: 'absolute', bottom: 8, left: 8, right: 8,
              backgroundColor: '#fff', borderRadius: 8, paddingVertical: 4, alignItems: 'center',
            }}>
              <Text style={{ color: COLORS.ink, fontWeight: '600', fontSize: 12 }}>نفد مؤقتاً</Text>
            </View>
          )}
        </View>

        {/* ── Name ── */}
        <Text numberOfLines={2} style={{ fontSize: 14, fontWeight: '600', color: COLORS.ink, lineHeight: 19, minHeight: 38 }}>
          {name}
        </Text>

        {/* ── Unit / pack size ── */}
        {(unitLine || unitCount > 1) && (
          <Text numberOfLines={1} style={{ fontSize: 12, color: COLORS.muted }}>
            {unitLine}{unitLine && unitCount > 1 ? ' · ' : ''}{unitCount > 1 ? `${unitCount} خيارات` : ''}
          </Text>
        )}

        {/* ── Price + add / stepper ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40, direction: 'rtl' as any }}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.ink }}>{priceNum}</Text>
              <Text style={{ fontSize: 11, fontWeight: '500', color: COLORS.ink }}>{CURRENCY_SYMBOL}</Text>
            </View>
            {(discounted || flashActive) && (
              <Text style={{ fontSize: 11, color: COLORS.faint, textDecorationLine: 'line-through' }}>
                {Number(product.price).toFixed(3)}
              </Text>
            )}
          </View>

          {!outOfStock && (
            cartQty > 0 ? (
              <View style={{
                flexDirection: 'row', alignItems: 'center', height: 40,
                borderRadius: 12, backgroundColor: COLORS.brandTint, paddingHorizontal: 2,
              }}>
                <TouchableOpacity
                  onPress={() => updateQuantity(product.id, cartQty + 1)}
                  accessibilityLabel="زيادة الكمية"
                  activeOpacity={0.7}
                  style={{ width: 34, height: 36, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="add" size={20} color={COLORS.brandText} />
                </TouchableOpacity>
                <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.ink, minWidth: 18, textAlign: 'center' }}>
                  {cartQty}
                </Text>
                <TouchableOpacity
                  onPress={() => updateQuantity(product.id, cartQty - 1)}
                  disabled={cartQty <= minQty}
                  accessibilityLabel="إنقاص الكمية"
                  activeOpacity={0.7}
                  style={{ width: 34, height: 36, alignItems: 'center', justifyContent: 'center', opacity: cartQty <= minQty ? 0.35 : 1 }}
                >
                  <Ionicons name="remove" size={20} color={COLORS.brandText} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleAddToCart}
                accessibilityLabel="أضف إلى السلة"
                activeOpacity={0.82}
                style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: COLORS.brandFill,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name="add" size={22} color="#fff" />
              </TouchableOpacity>
            )
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
