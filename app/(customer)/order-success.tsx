import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, Animated, Easing, ScrollView, Dimensions, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

const BRAND = '#e36523';
const { width: SW } = Dimensions.get('window');

// ─── Confetti particle ────────────────────────────────────────────────────────
const COLORS = ['#e36523', '#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa'];
function ConfettiParticle({ delay, x }: { delay: number; x: number }) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const rotate     = useRef(new Animated.Value(0)).current;
  const color      = COLORS[Math.floor(Math.abs(x * 7) % COLORS.length)];
  const size       = 7 + Math.floor(Math.abs(x * 3) % 6);

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(translateY, {
          toValue: 280 + Math.floor(Math.abs(x) % 80),
          duration: 1400 + Math.floor(Math.abs(x * 5) % 600),
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 3 + Math.abs(x % 2),
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(900),
          Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
      ]),
    ]);
    anim.start();
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 4], outputRange: ['0deg', '720deg'] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: x,
        width: size,
        height: size * 0.5,
        borderRadius: 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { rotate: spin }],
      }}
    />
  );
}

// ─── Confetti burst ───────────────────────────────────────────────────────────
function Confetti() {
  if (Platform.OS === 'web') return null;
  const particles = Array.from({ length: 22 }, (_, i) => ({
    x: 20 + (i * 37) % (SW - 40),
    delay: i * 55,
  }));
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320, pointerEvents: 'none' as any, overflow: 'hidden' }}>
      {particles.map((p, i) => <ConfettiParticle key={i} x={p.x} delay={p.delay} />)}
    </View>
  );
}

// ─── Status timeline ──────────────────────────────────────────────────────────
function OrderTimeline() {
  const steps = [
    { icon: '📋', label: 'تم استلام الطلب', sublabel: 'الآن', done: true },
    { icon: '👨‍🍳', label: 'جاري التحضير', sublabel: 'خلال ساعة', done: false },
    { icon: '🚚', label: 'في الطريق إليك', sublabel: 'قريباً', done: false },
    { icon: '✅', label: 'تم التسليم', sublabel: '2–3 أيام عمل', done: false },
  ];

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, marginHorizontal: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 }}>
      <Text style={{ fontSize: 14, fontWeight: '800', color: '#1c1917', marginBottom: 16, textAlign: 'right' }}>
        تتبع طلبك
      </Text>
      {steps.map((step, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          {/* Line + dot */}
          <View style={{ alignItems: 'center', width: 32 }}>
            <View style={{
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: step.done ? BRAND : '#f3f4f6',
              alignItems: 'center', justifyContent: 'center',
              borderWidth: step.done ? 0 : 1.5,
              borderColor: '#e5e7eb',
            }}>
              <Text style={{ fontSize: 14 }}>{step.icon}</Text>
            </View>
            {i < steps.length - 1 && (
              <View style={{ width: 2, height: 24, backgroundColor: step.done ? BRAND : '#e5e7eb', marginVertical: 2 }} />
            )}
          </View>
          {/* Labels */}
          <View style={{ flex: 1, paddingTop: 6, paddingBottom: i < steps.length - 1 ? 0 : 0 }}>
            <Text style={{ fontSize: 13, fontWeight: step.done ? '800' : '600', color: step.done ? '#1c1917' : '#9ca3af' }}>
              {step.label}
            </Text>
            <Text style={{ fontSize: 11, color: step.done ? BRAND : '#c9bfb6', marginTop: 1, marginBottom: i < steps.length - 1 ? 8 : 0 }}>
              {step.sublabel}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function OrderSuccessScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orderId, orderNumber } = useLocalSearchParams<{ orderId: string; orderNumber: string }>();
  const displayNumber = orderNumber ?? orderId?.slice(0, 8).toUpperCase();

  // Animated values
  const iconScale   = useRef(new Animated.Value(0)).current;
  const iconRotate  = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(40)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(iconScale, {
        toValue: 1,
        tension: 60,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(contentSlide, { toValue: 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const spin = iconRotate.interpolate({ inputRange: [0, 1], outputRange: ['-15deg', '0deg'] });

  return (
    <View style={{ flex: 1, backgroundColor: '#f9f7f5', paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <Confetti />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero section */}
        <View style={{
          height: 260, backgroundColor: '#fff7ed',
          borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}>
          {/* Outer ring */}
          <Animated.View style={{
            width: 130, height: 130, borderRadius: 65,
            backgroundColor: '#fff',
            alignItems: 'center', justifyContent: 'center',
            shadowColor: BRAND, shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2, shadowRadius: 24, elevation: 10,
            transform: [{ scale: iconScale }, { rotate: spin }],
          }}>
            <View style={{
              width: 100, height: 100, borderRadius: 50,
              backgroundColor: BRAND,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 46 }}>✓</Text>
            </View>
          </Animated.View>
        </View>

        {/* Title + subtitle */}
        <Animated.View style={{
          alignItems: 'center', paddingHorizontal: 28, marginBottom: 24,
          opacity: contentOpacity,
          transform: [{ translateY: contentSlide }],
        }}>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#111827', textAlign: 'center', marginBottom: 8 }}>
            🎉 تم تأكيد طلبك!
          </Text>
          <Text style={{ fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 24 }}>
            شكراً لك! سنبدأ بتحضير طلبك فوراً وسيصلك في أقرب وقت ممكن.
          </Text>
        </Animated.View>

        {/* Order number card */}
        <Animated.View style={{
          marginHorizontal: 20, marginBottom: 20,
          opacity: contentOpacity,
          transform: [{ translateY: contentSlide }],
        }}>
          {displayNumber && (
            <View style={{
              backgroundColor: '#fff', borderRadius: 20,
              padding: 20, alignItems: 'center',
              shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.07, shadowRadius: 12, elevation: 4,
              borderWidth: 1, borderColor: '#f0ece6',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Text style={{ fontSize: 14, color: '#9ca3af' }}>رقم الطلب</Text>
              </View>
              <Text style={{ fontSize: 28, fontWeight: '900', color: BRAND, letterSpacing: 1.5 }}>
                #{displayNumber}
              </Text>
              <View style={{ marginTop: 14, backgroundColor: '#f0fdf4', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' }} />
                <Text style={{ fontSize: 13, color: '#16a34a', fontWeight: '700' }}>قيد التحضير</Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Delivery estimate banner */}
        <Animated.View style={{
          marginHorizontal: 20, marginBottom: 20,
          opacity: contentOpacity,
          transform: [{ translateY: contentSlide }],
        }}>
          <View style={{
            backgroundColor: '#fff7ed', borderRadius: 16, padding: 16,
            flexDirection: 'row', alignItems: 'center', gap: 14,
            borderWidth: 1, borderColor: '#fed7aa',
          }}>
            <Text style={{ fontSize: 28 }}>🚚</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1c1917' }}>الوقت المتوقع للتسليم</Text>
              <Text style={{ fontSize: 13, color: '#857d78', marginTop: 2 }}>2 – 3 أيام عمل</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '900', color: BRAND }}>مجاني</Text>
          </View>
        </Animated.View>

        {/* Order timeline */}
        <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentSlide }] }}>
          <OrderTimeline />
        </Animated.View>

        {/* CTA buttons */}
        <Animated.View style={{
          paddingHorizontal: 20, gap: 12,
          opacity: contentOpacity,
          transform: [{ translateY: contentSlide }],
        }}>
          <TouchableOpacity
            onPress={() => router.push('/(customer)/orders/')}
            activeOpacity={0.85}
            style={{
              backgroundColor: BRAND, borderRadius: 18,
              paddingVertical: 17, alignItems: 'center',
              flexDirection: 'row', justifyContent: 'center', gap: 8,
              shadowColor: BRAND, shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
            }}
          >
            <Text style={{ fontSize: 20 }}>📦</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>تتبع الطلب</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/(customer)/home' as any)}
            activeOpacity={0.8}
            style={{
              backgroundColor: '#fff', borderRadius: 18,
              paddingVertical: 15, alignItems: 'center',
              flexDirection: 'row', justifyContent: 'center', gap: 8,
              borderWidth: 1.5, borderColor: '#e6e0d8',
            }}
          >
            <Text style={{ fontSize: 20 }}>🛍️</Text>
            <Text style={{ color: '#1c1917', fontSize: 15, fontWeight: '700' }}>متابعة التسوق</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
