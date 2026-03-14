import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useFavoriteProducts, useToggleFavorite } from '@/hooks/useFavorites';
import { formatPrice } from '@/utils/formatPrice';
import { getCurrentLocale } from '@/i18n';
import { getProductName, hasDiscount, Product } from '@/types/models';
import { useCart } from '@/hooks/useCart';

function WishlistItem({ product }: { product: Product }) {
  const locale = getCurrentLocale();
  const router = useRouter();
  const { addItem } = useCart();
  const toggleFavorite = useToggleFavorite();
  const name = getProductName(product, locale);
  const discounted = hasDiscount(product);
  const mainImage = (product.images?.[0] ?? (product as any).product_images?.[0])?.url;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(public)/products/${product.id}` as any)}
      activeOpacity={0.92}
      style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 20,
        marginHorizontal: 16, marginVertical: 6,
        padding: 12,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
      }}
    >
      <Image
        source={{ uri: mainImage }}
        style={{ width: 80, height: 80, borderRadius: 14 }}
        contentFit="cover"
      />
      <View style={{ flex: 1, marginHorizontal: 12 }}>
        <Text numberOfLines={2} style={{ fontSize: 14, fontWeight: '700', color: '#1c1917', lineHeight: 20 }}>
          {name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#e36523' }}>
            {formatPrice(discounted ? product.discount_price! : product.price)}
          </Text>
          {discounted && (
            <Text style={{ fontSize: 11, color: '#857d78', textDecorationLine: 'line-through' }}>
              {formatPrice(product.price)}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => addItem({ id: '', cart_id: '', product_id: product.id, quantity: 1, product })}
          disabled={product.stock_quantity === 0}
          style={{
            marginTop: 8, backgroundColor: product.stock_quantity === 0 ? '#e6e0d8' : '#e36523',
            borderRadius: 10, paddingVertical: 6, paddingHorizontal: 14, alignSelf: 'flex-start',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
            {product.stock_quantity === 0 ? 'نفد المخزون' : 'أضف للسلة'}
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        onPress={() => toggleFavorite.mutate({ productId: product.id, isFavorited: true })}
        style={{
          width: 34, height: 34, borderRadius: 17,
          backgroundColor: '#fff0eb',
          alignItems: 'center', justifyContent: 'center',
          alignSelf: 'flex-start',
        }}
      >
        <Ionicons name="heart" size={18} color="#e36523" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function WishlistScreen() {
  const { data: products = [], isLoading } = useFavoriteProducts();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f7f5' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#1c1917' }}>المفضلة</Text>
        {products.length > 0 && (
          <View style={{
            position: 'absolute', right: 20,
            backgroundColor: '#fff0eb', borderRadius: 12,
            paddingHorizontal: 10, paddingVertical: 3,
          }}>
            <Text style={{ color: '#e36523', fontWeight: '700', fontSize: 13 }}>{products.length}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#e36523" />
        </View>
      ) : products.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Ionicons name="heart-outline" size={56} color="#e6e0d8" />
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#857d78' }}>
            قائمة المفضلة فارغة
          </Text>
          <Text style={{ fontSize: 13, color: '#857d78', textAlign: 'center', paddingHorizontal: 40 }}>
            اضغط على قلب أي منتج لإضافته هنا
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <WishlistItem product={item} />}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
