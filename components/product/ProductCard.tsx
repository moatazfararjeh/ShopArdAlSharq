import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '@/hooks/useCart';
import { useCartStore } from '@/stores/cartStore';
import { useFavoriteIds, useToggleFavorite } from '@/hooks/useFavorites';
import { useToastStore } from '@/stores/toastStore';
import { Product } from '@/types/models';
import { getCurrentLocale } from '@/i18n';
import { getProductName, hasDiscount } from '@/types/models';
import { formatPrice, getDiscountPercent } from '@/utils/formatPrice';

const BRAND   = '#e36523';
const BG_POOL = ['#f5f0ea', '#eef0f5', '#f0f5ee', '#f5eef0', '#f5f3ee'];

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

  const liked       = favoriteIds.includes(product.id);
  const name        = getProductName(product, locale);
  const mainImage   = (product.images?.[0] ?? product.product_images?.[0])?.url ?? product.categories?.image_url ?? undefined;
  const discounted  = hasDiscount(product);
  const outOfStock  = product.stock_quantity === 0;
  const bgColor     = BG_POOL[(product.id.charCodeAt(0) ?? 0) % BG_POOL.length];
  const salePercent = discounted ? getDiscountPercent(product.price, product.discount_price!) : 0;
  const displayPrice = discounted ? product.discount_price! : product.price;

  // How many unit types this product has
  const unitCount = [product.price_per_piece, product.price_per_kg, product.price_per_carton].filter(Boolean).length;

  function handleAddToCart() {
    if (outOfStock) return;
    addItem({ id: '', cart_id: '', product_id: product.id, quantity: 1, selected_unit: null, product });
    showToast(`تمت إضافة ${name} إلى السلة`);
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.91}
      style={{
        flex: 1,
        borderRadius: 20,
        backgroundColor: '#fff',
        shadowColor: '#1c1917',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.09,
        shadowRadius: 10,
        elevation: 4,
        overflow: 'hidden',
      }}
    >
      {/* ── Image block ── */}
      <View style={{
        aspectRatio: 3 / 4,
        backgroundColor: bgColor,
        position: 'relative',
      }}>
        <Image
          source={{ uri: mainImage }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />

        {/* Gradient veil at bottom for text contrast */}
        <View style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 60,
          // Achieved via backgroundColor with opacity trick (no LinearGradient dep)
        }} pointerEvents="none" />

        {/* Out-of-stock overlay */}
        {outOfStock && (
          <View style={{
            position: 'absolute', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.42)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 }}>
              <Text style={{ color: '#1c1917', fontWeight: '800', fontSize: 12 }}>نفد المخزون</Text>
            </View>
          </View>
        )}

        {/* Sale badge — top right */}
        {discounted && !outOfStock && salePercent > 0 && (
          <View style={{
            position: 'absolute', top: 10, right: 10,
            backgroundColor: '#ef4444',
            borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
          }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>-{salePercent}%</Text>
          </View>
        )}

        {/* Heart button — top left */}
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation(); toggleFavorite.mutate({ productId: product.id, isFavorited: liked }); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            position: 'absolute', top: 10, left: 10,
            width: 34, height: 34, borderRadius: 17,
            backgroundColor: liked ? '#fef2f2' : 'rgba(255,255,255,0.88)',
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
          }}
          activeOpacity={0.75}
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={17}
            color={liked ? '#ef4444' : '#6b7280'}
          />
        </TouchableOpacity>

        {/* Unit count badge — bottom left of image */}
        {unitCount > 1 && (
          <View style={{
            position: 'absolute', bottom: 10, left: 10,
            backgroundColor: 'rgba(255,255,255,0.92)',
            borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3,
          }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: BRAND }}>
              {unitCount} أسعار
            </Text>
          </View>
        )}
      </View>

      {/* ── Info block ── */}
      <View style={{ padding: 11, gap: 4 }}>

        {/* Brand */}
        {product.brands?.name && (
          <Text style={{ fontSize: 10, color: '#a39890', fontWeight: '700', textAlign: 'right' }}>
            {product.brands.name}
          </Text>
        )}

        {/* Product name */}
        <Text
          numberOfLines={2}
          style={{ fontSize: 13, fontWeight: '800', color: '#1c1917', lineHeight: 18, textAlign: 'right' }}
        >
          {name}
        </Text>

        {/* Weight */}
        {product.weight != null && (
          <Text style={{ fontSize: 10, color: '#b0a89e', textAlign: 'right' }}>
            {product.weight} {product.weight_unit ?? 'غم'}
          </Text>
        )}

        {/* Price row + add-to-cart */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>

          {/* Price */}
          <View>
            <Text style={{ fontSize: 15, fontWeight: '900', color: BRAND }}>
              {formatPrice(displayPrice)}
            </Text>
            {discounted && (
              <Text style={{ fontSize: 10, color: '#c9bfb6', textDecorationLine: 'line-through', marginTop: -1 }}>
                {formatPrice(product.price)}
              </Text>
            )}
          </View>

          {/* Add / stepper */}
          {!outOfStock && (
            cartQty > 0 ? (
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                borderRadius: 10, borderWidth: 1.5, borderColor: BRAND,
                overflow: 'hidden',
              }}>
                <TouchableOpacity
                  onPress={() => updateQuantity(product.id, cartQty - 1)}
                  activeOpacity={0.7}
                  style={{ paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#fff0eb' }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '900', color: BRAND, lineHeight: 16 }}>−</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 12, fontWeight: '900', color: '#1c1917', minWidth: 22, textAlign: 'center' }}>
                  {cartQty}
                </Text>
                <TouchableOpacity
                  onPress={() => updateQuantity(product.id, cartQty + 1)}
                  activeOpacity={0.7}
                  style={{ paddingHorizontal: 8, paddingVertical: 5, backgroundColor: BRAND }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#fff', lineHeight: 16 }}>+</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleAddToCart}
                activeOpacity={0.82}
                style={{
                  width: 34, height: 34, borderRadius: 12,
                  backgroundColor: BRAND,
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: BRAND, shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
                }}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
