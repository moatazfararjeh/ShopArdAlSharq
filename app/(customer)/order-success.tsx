import { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Animated, Easing, ScrollView, Dimensions, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useOrder } from '@/hooks/useOrders';
import { formatPrice } from '@/utils/formatPrice';
import { Skeleton } from '@/components/ui/Skeleton';
import { COLORS } from '@/lib/theme';

const { width: SW } = Dimensions.get('window');

// ─── Confetti particle ────────────────────────────────────────────────────────
const CONFETTI = [COLORS.brand, '#F2B441', COLORS.green, '#5B8DEF', '#E86AA6'];
function ConfettiParticle({ delay, x }: { delay: number; x: number }) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const rotate     = useRef(new Animated.Value(0)).current;
  const color      = CONFETTI[Math.floor(Math.abs(x * 7) % CONFETTI.length)];
  const size       = 7 + Math.floor(Math.abs(x * 3) % 6);

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(translateY, {
          toValue: 260 + Math.floor(Math.abs(x) % 80),
          duration: 1400 + Math.floor(Math.abs(x * 5) % 600),
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(rotate, { toValue: 3 + Math.abs(x % 2), duration: 1400, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(900),
          Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 4], outputRange: ['0deg', '720deg'] });

  return (
    <Animated.View
      style={{
        position: 'absolute', top: 0, left: x,
        width: size, height: size * 0.5, borderRadius: 2,
        backgroundColor: color, opacity,
        transform: [{ translateY }, { rotate: spin }],
      }}
    />
  );
}

function Confetti() {
  if (Platform.OS === 'web') return null;
  const particles = Array.from({ length: 22 }, (_, i) => ({ x: 20 + (i * 37) % (SW - 40), delay: i * 55 }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320, overflow: 'hidden' }}>
      {particles.map((p, i) => <ConfettiParticle key={i} x={p.x} delay={p.delay} />)}
    </View>
  );
}

// ─── What happens next ────────────────────────────────────────────────────────
const NEXT_STEPS: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  { icon: 'checkmark-circle-outline', title: 'نراجع طلبك ونؤكده',  text: 'ستصلك رسالة عند تأكيد الطلب' },
  { icon: 'cube-outline',             title: 'نجهّز منتجاتك',       text: 'يتم تجهيز الطلب بعد التأكيد' },
  { icon: 'car-outline',              title: 'يصلك الطلب',          text: 'الدفع نقداً للسائق عند الاستلام' },
];

const STATUS_LABEL: Record<string, string> = {
  pending: 'قيد الانتظار', confirmed: 'تم التأكيد', preparing: 'جارٍ التحضير',
  shipped: 'في الطريق', delivered: 'تم التسليم', cancelled: 'ملغى',
};

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function OrderSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orderId, orderNumber } = useLocalSearchParams<{ orderId: string; orderNumber: string }>();
  const { data: order, isLoading } = useOrder(orderId ?? '');

  const displayNumber = (orderNumber && orderNumber !== 'undefined')
    ? orderNumber
    : order?.order_number ?? orderId?.slice(0, 8).toUpperCase();
  const status = order?.status ?? 'pending';
  const addr = (order?.delivery_address ?? {}) as Record<string, string | null>;
  const items = order?.items ?? [];
  const thumbs = items.slice(0, 4).map((it) => (it.product?.images?.[0] ?? it.product?.product_images?.[0])?.url);

  // Entrance animation
  const iconScale      = useRef(new Animated.Value(0)).current;
  const contentSlide   = useRef(new Animated.Value(30)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(iconScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(contentSlide,   { toValue: 0, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 1, duration: 360, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const fadeUp = { opacity: contentOpacity, transform: [{ translateY: contentSlide }] };
  const goToOrder = () => orderId
    ? router.replace(`/(customer)/orders/${orderId}` as any)
    : router.replace('/(customer)/orders/' as any);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface, paddingTop: insets.top, direction: 'rtl' as any }}>
      <Confetti />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 28, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* ── Success mark + headline ── */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Animated.View style={{
            width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.greenTint,
            alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            transform: [{ scale: iconScale }],
          }}>
            <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="checkmark" size={40} color="#fff" />
            </View>
          </Animated.View>
          <Animated.View style={[{ alignItems: 'center' }, fadeUp]}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.ink, textAlign: 'center' }}>تم استلام طلبك بنجاح</Text>
            <Text style={{ fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 22, marginTop: 6, paddingHorizontal: 12 }}>
              شكراً لك! سنراجع طلبك ونؤكده قريباً، وستصلك الإشعارات بكل تحديث.
            </Text>
          </Animated.View>
        </View>

        <Animated.View style={fadeUp}>
          {/* ── Order number + status ── */}
          <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="receipt-outline" size={22} color={COLORS.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: COLORS.muted }}>رقم الطلب</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.ink, textAlign: 'right' }} numberOfLines={1}>
                {displayNumber ?? '—'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.brandTint, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.brandFill }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.brandText }}>{STATUS_LABEL[status] ?? status}</Text>
            </View>
          </View>

          {/* ── Order summary (from the real order) ── */}
          {isLoading ? (
            <Skeleton height={150} borderRadius={18} style={{ marginBottom: 12 }} />
          ) : order ? (
            <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 12, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flexDirection: 'row' }}>
                  {thumbs.map((url, i) => (
                    <View key={i} style={{
                      width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, padding: 5,
                      borderWidth: 2, borderColor: '#fff', marginStart: i === 0 ? 0 : -10,
                    }}>
                      {url ? <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
                           : <Ionicons name="cube-outline" size={18} color={COLORS.faint} />}
                    </View>
                  ))}
                </View>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.ink }}>
                  {items.length} {items.length === 1 ? 'منتج' : 'منتجات'}
                </Text>
                <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.ink }}>{formatPrice(order.total_amount)}</Text>
              </View>

              <View style={{ height: 1, backgroundColor: COLORS.line }} />

              {(addr.label || addr.city) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="location-outline" size={18} color={COLORS.muted} />
                  <Text style={{ flex: 1, fontSize: 13, color: COLORS.ink }} numberOfLines={1}>
                    {[addr.label, addr.city, addr.district].filter(Boolean).join(' — ')}
                  </Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="cash-outline" size={18} color={COLORS.muted} />
                <Text style={{ flex: 1, fontSize: 13, color: COLORS.ink }}>الدفع عند الاستلام</Text>
              </View>
            </View>
          ) : null}

          {/* ── What happens next ── */}
          <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.ink, marginBottom: 12 }}>ماذا بعد؟</Text>
            {NEXT_STEPS.map((step, i) => (
              <View key={step.title} style={{ flexDirection: 'row', gap: 12, marginBottom: i === NEXT_STEPS.length - 1 ? 0 : 14 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: i === 0 ? COLORS.brandTint : COLORS.surface, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={step.icon} size={19} color={i === 0 ? COLORS.brandText : COLORS.ink} />
                </View>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.ink }}>{step.title}</Text>
                  <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 1 }}>{step.text}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── Actions ── */}
          <TouchableOpacity
            onPress={goToOrder}
            activeOpacity={0.85}
            style={{
              backgroundColor: COLORS.brandFill, borderRadius: 14, height: 54,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10,
            }}
          >
            <Ionicons name="navigate-outline" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>تتبع الطلب</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/(customer)/home' as any)}
            activeOpacity={0.8}
            style={{
              backgroundColor: '#fff', borderRadius: 14, height: 52,
              borderWidth: 1, borderColor: COLORS.line,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Ionicons name="bag-handle-outline" size={20} color={COLORS.ink} />
            <Text style={{ color: COLORS.ink, fontSize: 15, fontWeight: '600' }}>متابعة التسوق</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
