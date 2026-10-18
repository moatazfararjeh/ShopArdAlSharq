import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, Modal, Animated, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useSignOut } from '@/hooks/useAuth';
import { COLORS } from '@/lib/theme';

// Native counterpart of the burger drawer in CustomerWebLayout (web only).
// Slides in from the right (start edge in RTL).

const WIDTH = 290;

type Item = { label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap; path: string };

const MAIN_ITEMS: Item[] = [
  { label: 'الرئيسية', icon: 'home-outline',    activeIcon: 'home',    path: '/home' },
  { label: 'المفضلة',  icon: 'heart-outline',   activeIcon: 'heart',   path: '/wishlist' },
  { label: 'السلة',    icon: 'bag-outline',     activeIcon: 'bag',     path: '/cart' },
  { label: 'طلباتي',   icon: 'receipt-outline', activeIcon: 'receipt', path: '/orders' },
  { label: 'حسابي',    icon: 'person-outline',  activeIcon: 'person',  path: '/profile' },
];

const EXTRA_ITEMS: Item[] = [
  { label: 'العلامات التجارية', icon: 'pricetags-outline',           activeIcon: 'pricetags',            path: '/brands' },
  { label: 'تواصل معنا',        icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses',  path: '/contact' },
];

export function SideMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router    = useRouter();
  const pathname  = usePathname();
  const insets    = useSafeAreaInsets();
  const itemCount = useCartStore((s) => s.summary.itemCount);
  const profile   = useAuthStore((s) => s.profile);
  const signOut   = useSignOut();

  const slide = useRef(new Animated.Value(WIDTH)).current;
  const fade  = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  // Slide in only once the Modal's views exist — a native-driver animation
  // started before they mount never reaches them and the panel stays hidden.
  function animateIn() {
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(fade,  { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }

  useEffect(() => {
    if (visible) {
      setMounted(true);
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(slide, { toValue: WIDTH, duration: 220, useNativeDriver: true }),
        Animated.timing(fade,  { toValue: 0,     duration: 220, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  // Close first, then navigate, so the slide-out isn't cut off by the new screen
  function go(path: string) {
    onClose();
    setTimeout(() => router.push(`/(customer)${path}` as any), 120);
  }

  function handleSignOut() {
    onClose();
    setTimeout(() => signOut.mutate(undefined, { onSuccess: () => router.replace('/(public)/login' as any) }), 120);
  }

  const isActive = (path: string) =>
    pathname === path || (path === '/orders' && pathname.startsWith('/orders'));

  function Row({ item }: { item: Item }) {
    const active = isActive(item.path);
    return (
      <TouchableOpacity
        onPress={() => go(item.path)}
        activeOpacity={0.75}
        accessibilityRole="link"
        accessibilityState={{ selected: active }}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48,
          paddingHorizontal: 14, borderRadius: 12, marginBottom: 2,
          backgroundColor: active ? COLORS.brandTint : 'transparent',
        }}
      >
        <Ionicons name={active ? item.activeIcon : item.icon} size={22} color={active ? COLORS.brandText : COLORS.muted} />
        <Text style={{ flex: 1, fontSize: 15, fontWeight: active ? '700' : '500', color: active ? COLORS.brandText : COLORS.ink }}>
          {item.label}
        </Text>
        {item.path === '/cart' && itemCount > 0 && (
          <View style={{ minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 5, backgroundColor: COLORS.brandFill, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{itemCount > 9 ? '9+' : itemCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} onShow={animateIn} statusBarTranslucent>
      {/* Backdrop */}
      <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(28,25,23,0.45)', opacity: fade }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="إغلاق القائمة" />
      </Animated.View>

      {/* Panel — `start` is the right edge under forced RTL */}
      <Animated.View style={{
        position: 'absolute', top: 0, bottom: 0, start: 0, width: WIDTH,
        backgroundColor: '#fff', paddingTop: insets.top, paddingBottom: insets.bottom,
        transform: [{ translateX: slide }],
      }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 56, borderBottomWidth: 1, borderBottomColor: COLORS.line }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.ink }}>القائمة</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="إغلاق القائمة"
            style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={24} color={COLORS.ink} />
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        {profile && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: COLORS.surface }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.ink }}>{profile.full_name ? profile.full_name.charAt(0) : '؟'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: COLORS.muted }}>أهلاً،</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.ink }} numberOfLines={1}>{profile.full_name}</Text>
            </View>
          </View>
        )}

        <ScrollView contentContainerStyle={{ padding: 8 }}>
          {MAIN_ITEMS.map((item) => <Row key={item.path} item={item} />)}
          <View style={{ height: 1, backgroundColor: COLORS.line, marginVertical: 8, marginHorizontal: 8 }} />
          {EXTRA_ITEMS.map((item) => <Row key={item.path} item={item} />)}
          <View style={{ height: 1, backgroundColor: COLORS.line, marginVertical: 8, marginHorizontal: 8 }} />
          <TouchableOpacity onPress={handleSignOut} activeOpacity={0.75}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 14, borderRadius: 12 }}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.danger} />
            <Text style={{ fontSize: 15, fontWeight: '500', color: COLORS.danger }}>تسجيل الخروج</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
