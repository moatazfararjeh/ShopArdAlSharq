import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/utils/formatPrice';
import { getCurrentLocale } from '@/i18n';
import { getProductName, getProductDescription } from '@/types/models';
import { CartItem as CartItemType } from '@/types/models';
import { Image } from 'expo-image';
import { getCartItemPrice } from '@/stores/cartStore';

const DELIVERY_FEE = 0;

function CartItemRow({ item }: { item: CartItemType }) {
  const locale = getCurrentLocale();
  const { removeItem, updateQuantity } = useCart();
  const effectivePrice = getCartItemPrice(item);
  const description = getProductDescription(item.product, locale);

  const unitLabel = item.selected_unit ? { piece: 'حبة', carton: 'كرتون' }[item.selected_unit] : null;

  return (
    <View style={{
      marginHorizontal: 16, marginVertical: 6,
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#fff', borderRadius: 20,
      padding: 12,
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    }}>
      <Image
        source={{ uri: (item.product.images?.[0] ?? item.product.product_images?.[0])?.url }}
        style={{ width: 84, height: 84, borderRadius: 16 }}
        contentFit="cover"
      />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text
          style={{ fontSize: 14, fontWeight: '800', color: '#111827', lineHeight: 20 }}
          numberOfLines={1}
        >
          {getProductName(item.product, locale)}
        </Text>
        {!!description && (
          <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, lineHeight: 15 }} numberOfLines={2}>
            {description}
          </Text>
        )}
        {/* Rating row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <Text style={{ fontSize: 12, color: '#fbbf24' }}>★</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151' }}>4.5</Text>
          <Text style={{ fontSize: 11, color: '#9ca3af' }}>(400+ تقييم)</Text>
        </View>
        {/* Price + Qty stepper */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <View>
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#f97316' }}>
              {formatPrice(effectivePrice)}
            </Text>
            {unitLabel && (
              <View style={{ backgroundColor: '#fff0eb', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 2, alignSelf: 'flex-start' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#e36523' }}>{unitLabel}</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              onPress={() => updateQuantity(item.product_id, item.quantity - 1)}
              style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: item.quantity === 1 ? '#f3f4f6' : '#fff7ed',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: item.quantity === 1 ? '#e5e7eb' : '#fed7aa',
              }}
            >
              <Text style={{ fontWeight: '800', color: item.quantity === 1 ? '#9ca3af' : '#f97316', fontSize: 15, lineHeight: 17 }}>−</Text>
            </TouchableOpacity>
            <Text style={{ minWidth: 24, textAlign: 'center', fontSize: 14, fontWeight: '800', color: '#111827' }}>
              {item.quantity}
            </Text>
            <TouchableOpacity
              onPress={() => updateQuantity(item.product_id, item.quantity + 1)}
              style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: '#f97316',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ fontWeight: '800', color: '#fff', fontSize: 15, lineHeight: 17 }}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => removeItem(item.product_id)}
        style={{
          width: 28, height: 28, borderRadius: 14,
          backgroundColor: '#fef2f2',
          alignItems: 'center', justifyContent: 'center',
          alignSelf: 'flex-start', marginLeft: 8,
        }}
      >
        <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '700' }}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function CartScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { items, summary } = useCart();

  if (items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f0', paddingHorizontal: 32 }}>
        <View style={{
          width: 100, height: 100, borderRadius: 50,
          backgroundColor: '#fff7ed',
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}>
          <Text style={{ fontSize: 44 }}>🛒</Text>
        </View>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 }}>
          {t('cart.emptyCart')}
        </Text>
        <Text style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 28 }}>
          {t('cart.emptyCartDesc')}
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(customer)/home')}
          style={{
            backgroundColor: '#f97316', borderRadius: 16,
            paddingHorizontal: 32, paddingVertical: 14,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
            {t('cart.continueShopping')}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const totalWithDelivery = summary.total + DELIVERY_FEE;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f0' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827' }}>{t('cart.title')}</Text>
        <View style={{
          backgroundColor: '#fff7ed', borderRadius: 12,
          paddingHorizontal: 12, paddingVertical: 4,
        }}>
          <Text style={{ color: '#f97316', fontWeight: '700', fontSize: 13 }}>
            {items.length} {items.length === 1 ? 'منتج' : 'منتجات'}
          </Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.product_id}
        renderItem={({ item }) => <CartItemRow item={item} />}
        contentContainerStyle={{ paddingBottom: 260, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Summary footer */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32,
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 16,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ color: '#6b7280', fontSize: 14 }}>{t('cart.subtotal', { defaultValue: 'مجموع المنتجات' })}</Text>
          <Text style={{ fontWeight: '600', fontSize: 14, color: '#374151' }}>{formatPrice(summary.subtotal)}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ color: '#6b7280', fontSize: 14 }}>{t('cart.deliveryFee', { defaultValue: 'رسوم التوصيل' })}</Text>
          <Text style={{ fontWeight: '600', fontSize: 14, color: '#16a34a' }}>مجاني</Text>
        </View>
        {summary.discount > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ color: '#16a34a', fontSize: 14 }}>{t('cart.discount', { defaultValue: 'خصم' })}</Text>
            <Text style={{ fontWeight: '600', fontSize: 14, color: '#16a34a' }}>-{formatPrice(summary.discount)}</Text>
          </View>
        )}
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between',
          borderTopWidth: 1, borderTopColor: '#f3f4f6',
          paddingTop: 12, marginBottom: 16,
        }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>{t('cart.total')}</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#111827' }}>{formatPrice(totalWithDelivery)}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(customer)/checkout')}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#c94b0a',
            borderRadius: 18,
            paddingVertical: 17, alignItems: 'center',
            shadowColor: '#c94b0a', shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>
            {t('cart.checkout')} ←
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
