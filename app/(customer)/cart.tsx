import { useRef } from 'react';
import {
  View, Text, TouchableOpacity, Animated, PanResponder,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

const PLACEHOLDER_HASH = 'L9Q9mH00?bRi~WIUM{j[00t6xu%L';

const BRAND = '#e36523';
const SWIPE_THRESHOLD = -80;
const DELETE_BG = '#ef4444';

// ─── Unit label helpers ────────────────────────────────────────────────────────
type UnitKey = 'piece' | 'carton' | 'kg';
const UNIT_LABELS: Record<UnitKey, string> = { piece: 'حبة', carton: 'كرتون', kg: 'كيلو' };

function getAvailableUnits(item: CartItemType): UnitKey[] {
  const units: UnitKey[] = [];
  if (item.product.price_per_piece != null) units.push('piece');
  if (item.product.price_per_carton != null) units.push('carton');
  if (item.product.price_per_kg != null) units.push('kg');
  return units;
}

// ─── Swipeable cart item ───────────────────────────────────────────────────────
function CartItemRow({ item }: { item: CartItemType }) {
  const locale = getCurrentLocale();
  const { removeItem, updateQuantity } = useCart();
  const changeUnit = useCartStore((s) => s.changeUnit);
  const effectivePrice = getCartItemPrice(item);
  const description = getProductDescription(item.product, locale);
  const availableUnits = getAvailableUnits(item);
  const currentUnit = item.selected_unit as UnitKey | null;

  // Swipe animation
  const translateX = useRef(new Animated.Value(0)).current;
  const rowHeight = useRef(new Animated.Value(1)).current; // scale trick for collapse
  const opacity = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < SWIPE_THRESHOLD) {
          // Snap out then remove
          Animated.parallel([
            Animated.timing(translateX, { toValue: -400, duration: 220, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
          ]).start(() => removeItem(item.product_id));
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  // Delete button shown behind the card
  const deleteOpacity = translateX.interpolate({
    inputRange: [SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ position: 'relative', marginHorizontal: 16, marginVertical: 5 }}>
      {/* Red delete zone behind card */}
      <Animated.View
        style={{
          position: 'absolute', top: 0, bottom: 0, right: 0, left: 0,
          backgroundColor: DELETE_BG, borderRadius: 20,
          alignItems: 'flex-end', justifyContent: 'center',
          paddingEnd: 20, opacity: deleteOpacity,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>🗑 حذف</Text>
      </Animated.View>

      <Animated.View
        style={{ transform: [{ translateX }], opacity }}
        {...panResponder.panHandlers}
      >
        <View style={{
          flexDirection: 'row', alignItems: 'flex-start',
          backgroundColor: '#fff', borderRadius: 20,
          padding: 12,
          shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
        }}>
          {/* Product image */}
          <Image
            source={{ uri: (item.product.images?.[0] ?? item.product.product_images?.[0])?.url }}
            style={{ width: 84, height: 84, borderRadius: 16, flexShrink: 0 }}
            contentFit="cover"
            placeholder={{ blurhash: PLACEHOLDER_HASH }}
            transition={250}
          />

          <View style={{ flex: 1, marginStart: 12 }}>
            {/* Name */}
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827', lineHeight: 20 }} numberOfLines={1}>
              {getProductName(item.product, locale)}
            </Text>

            {/* Description */}
            {!!description && (
              <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, lineHeight: 15 }} numberOfLines={1}>
                {description}
              </Text>
            )}

            {/* Unit selector — only shown when product has multiple pricing units */}
            {availableUnits.length > 1 && (
              <View style={{ flexDirection: 'row', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
                {availableUnits.map((unit) => {
                  const isActive = currentUnit === unit;
                  return (
                    <TouchableOpacity
                      key={unit}
                      onPress={() => {
                        if (!isActive) changeUnit(item.product_id, currentUnit, unit);
                      }}
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

            {/* Single unit badge (no switcher needed) */}
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

            {/* Price + qty stepper */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: '900', color: BRAND }}>
                {formatPrice(effectivePrice)}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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

          {/* Delete button (tap fallback for web) */}
          {Platform.OS === 'web' && (
            <TouchableOpacity
              onPress={() => removeItem(item.product_id)}
              style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: '#fef2f2',
                alignItems: 'center', justifyContent: 'center',
                alignSelf: 'flex-start', marginStart: 8,
              }}
            >
              <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Swipe hint — shown once at top of list ────────────────────────────────────
function SwipeHint() {
  if (Platform.OS === 'web') return null;
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 6,
      marginHorizontal: 16, marginBottom: 4, marginTop: 2,
      backgroundColor: '#fef2f2', borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 7,
    }}>
      <Text style={{ fontSize: 12 }}>←</Text>
      <Text style={{ fontSize: 12, color: '#991b1b', fontWeight: '600' }}>اسحب المنتج لليسار للحذف</Text>
    </View>
  );
}

// ─── Main cart screen ─────────────────────────────────────────────────────────
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
          style={{ backgroundColor: BRAND, borderRadius: 16, paddingHorizontal: 32, paddingVertical: 14 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
            {t('cart.continueShopping')}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const totalWithDelivery = summary.total;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f0' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827' }}>{t('cart.title')}</Text>
        <View style={{ backgroundColor: '#fff7ed', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 }}>
          <Text style={{ color: BRAND, fontWeight: '700', fontSize: 13 }}>
            {items.length} {items.length === 1 ? 'منتج' : 'منتجات'}
          </Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => `${item.product_id}-${item.selected_unit ?? 'default'}`}
        ListHeaderComponent={<SwipeHint />}
        renderItem={({ item }) => <CartItemRow item={item} />}
        contentContainerStyle={{ paddingBottom: 270, paddingTop: 4 }}
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: '#6b7280', fontSize: 14 }}>{t('cart.subtotal', { defaultValue: 'مجموع المنتجات' })}</Text>
          <Text style={{ fontWeight: '600', fontSize: 14, color: '#374151' }}>{formatPrice(summary.subtotal)}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: '#6b7280', fontSize: 14 }}>{t('cart.deliveryFee', { defaultValue: 'رسوم التوصيل' })}</Text>
          <Text style={{ fontWeight: '600', fontSize: 14, color: '#16a34a' }}>مجاني</Text>
        </View>
        {summary.discount > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
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
            backgroundColor: BRAND,
            borderRadius: 18,
            paddingVertical: 17, alignItems: 'center',
            shadowColor: BRAND, shadowOffset: { width: 0, height: 6 },
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
