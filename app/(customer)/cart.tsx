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
import { getProductName, getProductDescription, getMinOrderQuantity, getProductUnits, UNIT_LABELS, SaleUnit } from '@/types/models';
import { CartItem as CartItemType } from '@/types/models';
import { Image } from 'expo-image';
import { getCartItemPrice } from '@/stores/cartStore';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/lib/theme';

const PLACEHOLDER_HASH = 'L9Q9mH00?bRi~WIUM{j[00t6xu%L';
const BRAND = COLORS.brandText;

type UnitKey = SaleUnit;

function getAvailableUnits(item: CartItemType): UnitKey[] {
  return getProductUnits(item.product).map((u) => u.unit);
}

function CartItemRow({ item, isLast }: { item: CartItemType; isLast: boolean }) {
  const locale = getCurrentLocale();
  const { removeItem, updateQuantity } = useCart();
  const changeUnit = useCartStore((s) => s.changeUnit);
  const effectivePrice = getCartItemPrice(item);
  const availableUnits = getAvailableUnits(item);
  const currentUnit = (item.selected_unit ?? availableUnits[0] ?? null) as UnitKey | null;
  const minQty = getMinOrderQuantity(item.product, item.selected_unit);
  const atMin = item.quantity <= minQty;

  return (
    <View style={{
      flexDirection: 'row', gap: 12, paddingVertical: 14,
      borderBottomWidth: isLast ? 0 : 1, borderBottomColor: COLORS.line,
      direction: 'rtl' as any,
    }}>
      <View style={{ width: 76, height: 76, borderRadius: 14, backgroundColor: COLORS.surface, padding: 8, flexShrink: 0 }}>
        <Image
          source={{ uri: (item.product.images?.[0] ?? item.product.product_images?.[0])?.url }}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
          placeholder={{ blurhash: PLACEHOLDER_HASH }}
          transition={250}
        />
      </View>

      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.ink, lineHeight: 19 }} numberOfLines={2}>
            {getProductName(item.product, locale)}
          </Text>
          <TouchableOpacity
            onPress={() => removeItem(item.product_id)}
            accessibilityLabel="حذف المنتج"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginTop: -4 }}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.faint} />
          </TouchableOpacity>
        </View>

        {/* Unit switcher (only when the product sells in more than one unit) */}
        {availableUnits.length > 1 ? (
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {availableUnits.map((unit) => {
              const isActive = currentUnit === unit;
              return (
                <TouchableOpacity
                  key={unit}
                  onPress={() => { if (!isActive) changeUnit(item.product_id, currentUnit, unit); }}
                  accessibilityState={{ selected: isActive }}
                  activeOpacity={0.75}
                  style={{
                    height: 30, paddingHorizontal: 12, borderRadius: 9, justifyContent: 'center',
                    borderWidth: 1, borderColor: isActive ? COLORS.ink : COLORS.line,
                    backgroundColor: isActive ? COLORS.ink : '#fff',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: isActive ? '#fff' : COLORS.ink }}>
                    {UNIT_LABELS[unit]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : currentUnit ? (
          <Text style={{ fontSize: 12, color: COLORS.muted }}>{UNIT_LABELS[currentUnit]}</Text>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.ink }}>
            {formatPrice(effectivePrice)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', height: 36, borderRadius: 11, backgroundColor: COLORS.surface, paddingHorizontal: 2 }}>
            <TouchableOpacity
              onPress={() => updateQuantity(item.product_id, item.quantity + 1)}
              accessibilityLabel="زيادة الكمية"
              style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="add" size={18} color={COLORS.ink} />
            </TouchableOpacity>
            <Text style={{ minWidth: 22, textAlign: 'center', fontSize: 15, fontWeight: '700', color: COLORS.ink }}>
              {item.quantity}
            </Text>
            <TouchableOpacity
              onPress={() => updateQuantity(item.product_id, item.quantity - 1)}
              disabled={atMin}
              accessibilityLabel="إنقاص الكمية"
              style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center', opacity: atMin ? 0.35 : 1 }}
            >
              <Ionicons name="remove" size={18} color={COLORS.ink} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

function SummaryRow({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', direction: 'rtl' as any }}>
      <Text style={{ color: COLORS.muted, fontSize: 14 }}>{label}</Text>
      <Text style={{ fontWeight: green ? '600' : '500', fontSize: 14, color: green ? COLORS.green : COLORS.ink }}>{value}</Text>
    </View>
  );
}

export default function CartScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { items, summary } = useCart();
  const insets = useSafeAreaInsets();
  const tabBarH = Platform.OS === 'ios' ? 84 : Platform.OS === 'web' ? 64 : 64;

  if (items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.canvas, paddingHorizontal: 32, direction: 'rtl' as any }}>
        <View style={{ width: 96, height: 96, borderRadius: 28, backgroundColor: COLORS.brandTint, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Ionicons name="bag-outline" size={44} color={COLORS.brandText} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.ink, marginBottom: 8 }}>{t('cart.emptyCart')}</Text>
        <Text style={{ fontSize: 14, color: COLORS.muted, textAlign: 'center', marginBottom: 28 }}>{t('cart.emptyCartDesc')}</Text>
        <TouchableOpacity onPress={() => router.push('/(customer)/home')} style={{ backgroundColor: COLORS.brandFill, borderRadius: 14, paddingHorizontal: 32, height: 52, justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{t('cart.continueShopping')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface, direction: 'rtl' as any }} edges={['top']}>
      {/* Header */}
      <View style={{ backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
        <Text style={{ fontSize: 19, fontWeight: '700', color: COLORS.ink }}>
          {t('cart.title')} <Text style={{ color: COLORS.muted, fontWeight: '500' }}>({items.length})</Text>
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => `${item.product_id}-${item.selected_unit ?? 'default'}`}
        renderItem={({ item, index }) => (
          <View style={{
            marginHorizontal: 16, backgroundColor: '#fff', paddingHorizontal: 14,
            borderTopLeftRadius: index === 0 ? 18 : 0, borderTopRightRadius: index === 0 ? 18 : 0,
            borderBottomLeftRadius: index === items.length - 1 ? 18 : 0, borderBottomRightRadius: index === items.length - 1 ? 18 : 0,
          }}>
            <CartItemRow item={item} isLast={index === items.length - 1} />
          </View>
        )}
        ListHeaderComponent={
          <View style={{
            marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 14,
            backgroundColor: COLORS.greenTint, flexDirection: 'row', alignItems: 'center', gap: 10,
          }}>
            <Ionicons name="car-outline" size={20} color={COLORS.green} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.green }}>التوصيل مجاني</Text>
          </View>
        }
        ListFooterComponent={
          <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: '#fff', borderRadius: 18, padding: 14, gap: 10 }}>
            <SummaryRow label={t('cart.subtotal', { defaultValue: 'مجموع المنتجات' })} value={formatPrice(summary.subtotal)} />
            {summary.discount > 0 && (
              <SummaryRow label={t('cart.discount', { defaultValue: 'خصم' })} value={`−${formatPrice(summary.discount)}`} green />
            )}
            <SummaryRow label={t('cart.deliveryFee', { defaultValue: 'رسوم التوصيل' })} value="مجاني" green />
            <View style={{ height: 1, backgroundColor: COLORS.line }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', direction: 'rtl' as any }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.ink }}>{t('cart.total')}</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.ink }}>{formatPrice(summary.total)}</Text>
            </View>
          </View>
        }
        contentContainerStyle={{ paddingTop: 12, paddingBottom: tabBarH + 110 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Sticky CTA, sits above the tab bar */}
      <View style={{
        // On web the page scrolls inside CustomerWebLayout, so pin to the viewport
        // just above its fixed 64px bottom bar.
        position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as any, left: 0, right: 0,
        bottom: tabBarH, zIndex: 50,
        backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.line,
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
      }}>
        <TouchableOpacity
          onPress={() => router.push('/(customer)/checkout')}
          activeOpacity={0.85}
          style={{
            backgroundColor: COLORS.brandFill, borderRadius: 14, height: 54, paddingHorizontal: 18,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', direction: 'rtl' as any,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{t('cart.checkout')}</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{formatPrice(summary.total)}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
