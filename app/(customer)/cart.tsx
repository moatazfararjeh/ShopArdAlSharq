import {
  View, Text, TouchableOpacity, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/hooks/useCart';
import { useCartStore } from '@/stores/cartStore';
import { formatPrice } from '@/utils/formatPrice';
import { getCurrentLocale } from '@/i18n';
import { getProductName, getProductDescription } from '@/types/models';
import { CartItem as CartItemType } from '@/types/models';
import { Image } from 'expo-image';
import { getCartItemPrice } from '@/stores/cartStore';
import { Ionicons } from '@expo/vector-icons';

const PLACEHOLDER_HASH = 'L9Q9mH00?bRi~WIUM{j[00t6xu%L';
const BRAND = '#e36523';

type UnitKey = 'piece' | 'carton' | 'kg';
const UNIT_LABELS: Record<UnitKey, string> = { piece: 'حبة', carton: 'كرتون', kg: 'كيلو' };

function getAvailableUnits(item: CartItemType): UnitKey[] {
  const units: UnitKey[] = [];
  if (item.product.price_per_piece != null) units.push('piece');
  if (item.product.price_per_carton != null) units.push('carton');
  if (item.product.price_per_kg != null) units.push('kg');
  return units;
}

function CartItemRow({ item }: { item: CartItemType }) {
  const locale = getCurrentLocale();
  const { removeItem, updateQuantity } = useCart();
  const changeUnit = useCartStore((s) => s.changeUnit);
  const effectivePrice = getCartItemPrice(item);
  const description = getProductDescription(item.product, locale);
  const availableUnits = getAvailableUnits(item);
  const currentUnit = item.selected_unit as UnitKey | null;

  return (
    <View style={{ marginHorizontal: 16, marginVertical: 5 }}>
      <View style={{
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: '#fff', borderRadius: 20,
        padding: 12,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
        direction: 'rtl' as any,
      }}>
        <Image
          source={{ uri: (item.product.images?.[0] ?? item.product.product_images?.[0])?.url }}
          style={{ width: 84, height: 84, borderRadius: 16, flexShrink: 0 }}
          contentFit="cover"
          placeholder={{ blurhash: PLACEHOLDER_HASH }}
          transition={250}
        />

        <View style={{ flex: 1, marginStart: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: '#111827', lineHeight: 20 }} numberOfLines={1}>
              {getProductName(item.product, locale)}
            </Text>
            <TouchableOpacity
              onPress={() => removeItem(item.product_id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: '#fef2f2',
                alignItems: 'center', justifyContent: 'center',
                marginStart: 8, flexShrink: 0,
              }}
            >
              <Ionicons name="trash-outline" size={15} color="#ef4444" />
            </TouchableOpacity>
          </View>

          {!!description && (
            <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, lineHeight: 15 }} numberOfLines={1}>
              {description}
            </Text>
          )}

          {availableUnits.length > 1 && (
            <View style={{ flexDirection: 'row', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
              {availableUnits.map((unit) => {
                const isActive = currentUnit === unit;
                return (
                  <TouchableOpacity
                    key={unit}
                    onPress={() => { if (!isActive) changeUnit(item.product_id, currentUnit, unit); }}
                    activeOpacity={0.75}
                    style={{
                      paddingHorizontal: 10, paddingVertical: 4,
                      borderRadius: 20, borderWidth: 1.5,
                      borderColor: BRAND,
                      backgroundColor: isActive ? BRAND : '#fff0eb',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: isActive ? '#fff' : BRAND }}>
                      {UNIT_LABELS[unit]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {availableUnits.length === 1 && currentUnit && (
            <View style={{
              marginTop: 6, alignSelf: 'flex-start',
              backgroundColor: '#fff0eb', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: BRAND }}>
                {UNIT_LABELS[currentUnit]}
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: BRAND }}>
              {formatPrice(effectivePrice)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, direction: 'ltr' as any }}>
              <TouchableOpacity
                onPress={() => updateQuantity(item.product_id, item.quantity - 1)}
                style={{
                  width: 30, height: 30, borderRadius: 15,
                  backgroundColor: item.quantity === 1 ? '#f3f4f6' : '#fff7ed',
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1, borderColor: item.quantity === 1 ? '#e5e7eb' : '#fed7aa',
                }}
              >
                <Text style={{ fontWeight: '800', color: item.quantity === 1 ? '#9ca3af' : BRAND, fontSize: 16, lineHeight: 18 }}>−</Text>
              </TouchableOpacity>
              <Text style={{ minWidth: 26, textAlign: 'center', fontSize: 14, fontWeight: '800', color: '#111827' }}>
                {item.quantity}
              </Text>
              <TouchableOpacity
                onPress={() => updateQuantity(item.product_id, item.quantity + 1)}
                style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontWeight: '800', color: '#fff', fontSize: 16, lineHeight: 18 }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { items, summary } = useCart();

  if (items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f0', paddingHorizontal: 32, direction: 'rtl' as any }}>
        <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 44 }}>🛒</Text>
        </View>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 }}>{t('cart.emptyCart')}</Text>
        <Text style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 28 }}>{t('cart.emptyCartDesc')}</Text>
        <TouchableOpacity onPress={() => router.push('/(customer)/home')} style={{ backgroundColor: BRAND, borderRadius: 16, paddingHorizontal: 32, paddingVertical: 14 }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{t('cart.continueShopping')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const totalWithDelivery = summary.total;
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f0', direction: 'rtl' as any }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, direction: 'rtl' as any }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827' }}>{t('cart.title')}</Text>
        <View style={{ backgroundColor: '#fff7ed', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 }}>
          <Text style={{ color: BRAND, fontWeight: '700', fontSize: 13 }}>{items.length} {items.length === 1 ? 'منتج' : 'منتجات'}</Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => `${item.product_id}-${item.selected_unit ?? 'default'}`}
        renderItem={({ item }) => <CartItemRow item={item} />}
        contentContainerStyle={{ paddingBottom: 300, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
      />

      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 24, paddingTop: 20, paddingBottom: Math.max(insets.bottom, 16) + 80,
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 16,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, direction: 'rtl' as any }}>
          <Text style={{ color: '#6b7280', fontSize: 14 }}>{t('cart.subtotal', { defaultValue: 'مجموع المنتجات' })}</Text>
          <Text style={{ fontWeight: '600', fontSize: 14, color: '#374151' }}>{formatPrice(summary.subtotal)}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, direction: 'rtl' as any }}>
          <Text style={{ color: '#6b7280', fontSize: 14 }}>{t('cart.deliveryFee', { defaultValue: 'رسوم التوصيل' })}</Text>
          <Text style={{ fontWeight: '600', fontSize: 14, color: '#16a34a' }}>مجاني</Text>
        </View>
        {summary.discount > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, direction: 'rtl' as any }}>
            <Text style={{ color: '#16a34a', fontSize: 14 }}>{t('cart.discount', { defaultValue: 'خصم' })}</Text>
            <Text style={{ fontWeight: '600', fontSize: 14, color: '#16a34a' }}>-{formatPrice(summary.discount)}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12, marginBottom: 16, direction: 'rtl' as any }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>{t('cart.total')}</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#111827' }}>{formatPrice(totalWithDelivery)}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(customer)/checkout')}
          activeOpacity={0.85}
          style={{
            backgroundColor: BRAND, borderRadius: 18, paddingVertical: 17, alignItems: 'center',
            shadowColor: BRAND, shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>{t('cart.checkout')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
