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
import { formatPrice } from '@/utils/formatPrice';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
}

// Warm secondary tones cycling per card
const CARD_BG_COLORS = ['#ede8e1', '#e8e3db', '#f0ece6', '#e5e0d8'];

export function ProductCard({ product, onPress }: ProductCardProps) {
  const locale = getCurrentLocale();
  const { addItem, updateQuantity } = useCart();
  const cartItems = useCartStore((s) => s.items);
  const cartQty = cartItems.find((i) => i.product_id === product.id)?.quantity ?? 0;
  const { data: favoriteIds = [] } = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const showToast = useToastStore((s) => s.show);
  const liked = favoriteIds.includes(product.id);
  const name = getProductName(product, locale);
  const mainImage = (product.images?.[0] ?? product.product_images?.[0])?.url;
  const discounted = hasDiscount(product);
  const outOfStock = product.stock_quantity === 0;
  const bgColor = CARD_BG_COLORS[(product.id.charCodeAt(0) ?? 0) % CARD_BG_COLORS.length];

  function handleAddToCart() {
    if (outOfStock) return;
    addItem({ id: '', cart_id: '', product_id: product.id, quantity: 1, selected_unit: null, product });
    showToast(`تمت إضافة ${name} إلى السلة`);
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.92} style={{ flex: 1 }}>
      {/* Image container — square, rounded */}
      <View style={{
        aspectRatio: 1,
        borderRadius: 16,
        backgroundColor: bgColor,
        overflow: 'hidden',
        marginBottom: 10,
      }}>
        <Image
          source={{ uri: mainImage }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />

        {/* Out-of-stock overlay */}
        {outOfStock && (
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.38)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: '#1c1917', fontWeight: '700', fontSize: 11 }}>نفد المخزون</Text>
            </View>
          </View>
        )}

        {/* NEW badge — top left */}
        <View style={{ position: 'absolute', top: 10, left: 10 }}>
          <View style={{ backgroundColor: '#e36523', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.6 }}>{locale === 'ar' ? 'جديد' : 'New'}</Text>
          </View>
        </View>

        {/* Sale badge — top right, before heart */}
        {discounted && !outOfStock && (
          <View style={{ position: 'absolute', top: 10, right: 44 }}>
            <View style={{ backgroundColor: '#f4c025', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: '#1c1917', fontSize: 10, fontWeight: '700' }}>{locale === 'ar' ? 'تخفيض' : 'Sale'}</Text>
            </View>
          </View>
        )}

        {/* Heart / wishlist button — top right */}
        <TouchableOpacity
          onPress={() => toggleFavorite.mutate({ productId: product.id, isFavorited: liked })}
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: 'rgba(253,252,251,0.82)',
            alignItems: 'center', justifyContent: 'center',
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={16}
            color={liked ? '#e36523' : '#1c1917'}
          />
        </TouchableOpacity>
      </View>

      {/* Info — below image */}
      <View style={{ paddingHorizontal: 2 }}>
        {/* Brand */}
        <Text style={{ fontSize: 10, fontWeight: '600', color: '#857d78', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 }}>
          {name.split(' ')[0] ?? 'منتج'}
        </Text>

        <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: '500', color: '#1c1917', lineHeight: 18, marginBottom: 2 }}>
          {name}
        </Text>
        {product.weight != null && (
          <Text style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>
            ⚖️ {product.weight} {product.weight_unit ?? 'كغ'}
          </Text>
        )}

        {/* Price row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1c1917' }}>
              {formatPrice(discounted ? product.discount_price! : product.price)}
            </Text>
            {discounted && (
              <Text style={{ fontSize: 11, color: '#857d78', textDecorationLine: 'line-through' }}>
                {formatPrice(product.price)}
              </Text>
            )}
            {(['piece', 'kg', 'carton'] as const)
              .filter((u) =>
                u === 'piece' ? product.price_per_piece != null
                : u === 'kg'  ? product.price_per_kg != null
                : product.price_per_carton != null
              )
              .map((u) => (
                <View key={u} style={{ backgroundColor: '#fff0eb', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#e36523' }}>
                    {u === 'carton' && product.pieces_per_carton
                      ? `كرتون (${product.pieces_per_carton} حبة)`
                      : { piece: 'حبة', kg: 'كيلو', carton: 'كرتون' }[u]}
                  </Text>
                </View>
              ))
            }
          </View>

          {/* Add to cart / quantity stepper */}
          {!outOfStock && (
            cartQty > 0 ? (
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                borderRadius: 15, overflow: 'hidden',
                borderWidth: 1.5, borderColor: '#e36523',
              }}>
                <TouchableOpacity
                  onPress={() => updateQuantity(product.id, cartQty - 1)}
                  activeOpacity={0.7}
                  style={{ paddingHorizontal: 7, paddingVertical: 3, backgroundColor: '#fff0eb' }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#e36523', lineHeight: 18 }}>−</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#1c1917', minWidth: 18, textAlign: 'center' }}>
                  {cartQty}
                </Text>
                <TouchableOpacity
                  onPress={() => updateQuantity(product.id, cartQty + 1)}
                  activeOpacity={0.7}
                  style={{ paddingHorizontal: 7, paddingVertical: 3, backgroundColor: '#e36523' }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff', lineHeight: 18 }}>+</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleAddToCart}
                activeOpacity={0.8}
                style={{
                  width: 30, height: 30, borderRadius: 15,
                  backgroundColor: '#e36523',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name="bag-outline" size={14} color="#fff" />
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

