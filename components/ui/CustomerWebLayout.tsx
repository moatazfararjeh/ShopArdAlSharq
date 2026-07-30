import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Linking, Platform, Animated, Pressable } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCartStore } from '@/stores/cartStore';
import { useSignOut } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { useUnreadCount } from '@/hooks/useNotifications';

const NAV_ITEMS = [
  { label: 'الرئيسية', icon: 'home-outline'    as const, activeIcon: 'home'    as const, path: '/home' },
  { label: 'المفضلة',  icon: 'heart-outline'   as const, activeIcon: 'heart'   as const, path: '/wishlist' },
  { label: 'السلة',    icon: 'bag-outline'     as const, activeIcon: 'bag'     as const, path: '/cart' },
  { label: 'طلباتي',  icon: 'receipt-outline' as const, activeIcon: 'receipt' as const, path: '/orders' },
  { label: 'حسابي',   icon: 'person-outline'  as const, activeIcon: 'person'  as const, path: '/profile' },
];

const ACTIVE_COLOR       = '#e36523';
const INACTIVE_COLOR     = '#857d78';
const DESKTOP_BREAKPOINT = 768;
const HEADER_HEIGHT      = 70;
const BOTTOM_BAR_HEIGHT  = 64;
const DRAWER_WIDTH       = 280;

const SAI_TOP    = 'env(safe-area-inset-top, 0px)';
const SAI_BOTTOM = 'env(safe-area-inset-bottom, 0px)';

function getBrowserWidth(): number {
  if (typeof window !== 'undefined' && window.innerWidth) return window.innerWidth;
  return 1200;
}

export function CustomerWebLayout({ children }: { children: React.ReactNode }) {
  const pathname        = usePathname();
  const router          = useRouter();
  const itemCount       = useCartStore((s) => s.summary.itemCount);
  const unreadCount     = useUnreadCount();
  const signOutMutation = useSignOut();
  const profile         = useAuthStore((s) => s.profile);

  const [winWidth, setWinWidth]     = useState<number>(getBrowserWidth);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim  = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const isDesktop = winWidth >= DESKTOP_BREAKPOINT;

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.timing(drawerAnim,  { toValue: 0,            duration: 280, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 1,            duration: 280, useNativeDriver: true }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(drawerAnim,  { toValue: DRAWER_WIDTH, duration: 240, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0,            duration: 240, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(false));
  };

  const navTo = (path: string) => {
    closeDrawer();
    setTimeout(() => router.push(`/(customer)${path}` as any), 60);
  };

  // ── Sidebar content (desktop only) ──────────────────────────────────────
  const sidebarContent = (
    <>
      {profile && (
        <View style={{ paddingHorizontal: 8, paddingBottom: 14 }}>
          <Text style={{ fontSize: 12, color: '#a09284' }}>أهلاً،</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#1c1917', marginTop: 2 }} numberOfLines={1}>
            {profile.full_name}
          </Text>
        </View>
      )}
      <View style={styles.divider} />
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.path || (item.path === '/orders' && pathname.startsWith('/orders'));
        return (
          <TouchableOpacity key={item.path} onPress={() => router.push(`/(customer)${item.path}` as any)} activeOpacity={0.75} style={[styles.navItem, isActive && styles.navItemActive]}>
            <Ionicons name={isActive ? item.activeIcon : item.icon} size={20} color={isActive ? ACTIVE_COLOR : '#857d78'} />
            <Text style={[styles.navLabel, { color: isActive ? ACTIVE_COLOR : '#5c4a35', fontWeight: isActive ? '700' : '500' }]}>{item.label}</Text>
            {item.path === '/cart' && itemCount > 0 && (<View style={styles.badge}><Text style={styles.badgeText}>{itemCount > 9 ? '9+' : itemCount}</Text></View>)}
          </TouchableOpacity>
        );
      })}
      <View style={[styles.divider, { marginTop: 12 }]} />
      <TouchableOpacity onPress={() => router.push('/(customer)/contact' as any)} activeOpacity={0.75} style={[styles.navItem, pathname === '/contact' && styles.navItemActive]}>
        <Ionicons name="chatbubble-ellipses-outline" size={20} color={pathname === '/contact' ? '#e36523' : '#857d78'} />
        <Text style={[styles.navLabel, { color: pathname === '/contact' ? '#e36523' : '#5c4a35', fontWeight: pathname === '/contact' ? '700' : '500' }]}>تواصل معنا</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => signOutMutation.mutate(undefined, { onSuccess: () => router.replace('/(public)/login' as any) })} activeOpacity={0.75} style={styles.navItem}>
        <Ionicons name="log-out-outline" size={20} color="#857d78" />
        <Text style={[styles.navLabel, { color: '#857d78' }]}>تسجيل الخروج</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <View style={{ flex: 1, flexDirection: 'column', backgroundColor: '#f8f7f5' }}>

      {/* ── Sticky top header ───────────────────────────────────────────── */}
      <View style={{
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e6e0d8',
        paddingHorizontal: isDesktop ? 32 : 16, paddingTop: SAI_TOP as any,
        minHeight: HEADER_HEIGHT, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', direction: 'ltr' as any,
        position: 'sticky' as any, top: 0, zIndex: 100, flexShrink: 0,
      }}>
        <TouchableOpacity onPress={() => router.push('/(customer)/home' as any)} activeOpacity={0.8} style={{ overflow: 'hidden', height: HEADER_HEIGHT, justifyContent: 'center' }}>
          <Image source={require('@/assets/logo.png')} style={{ width: isDesktop ? 300 : 200, height: HEADER_HEIGHT }} contentFit="contain" />
        </TouchableOpacity>

        {isDesktop && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={() => router.push('/(customer)/search' as any)} style={styles.headerBtn}><Ionicons name="search-outline" size={20} color="#5c4a35" /></TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(customer)/notifications' as any)} style={[styles.headerBtn, { position: 'relative' }]}>
              <Ionicons name="notifications-outline" size={20} color="#5c4a35" />
              {unreadCount > 0 && <View style={styles.dot}><Text style={styles.dotText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(customer)/cart' as any)} style={[styles.headerBtn, { position: 'relative' }]}>
              <Ionicons name="bag-outline" size={20} color="#5c4a35" />
              {itemCount > 0 && <View style={styles.dot}><Text style={styles.dotText}>{itemCount > 9 ? '9+' : itemCount}</Text></View>}
            </TouchableOpacity>
          </View>
        )}

        {/* Mobile: search + notifications + hamburger menu */}
        {!isDesktop && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <TouchableOpacity onPress={() => router.push('/(customer)/search' as any)} style={styles.headerBtn}><Ionicons name="search-outline" size={19} color="#5c4a35" /></TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(customer)/notifications' as any)} style={[styles.headerBtn, { position: 'relative' }]}>
              <Ionicons name="notifications-outline" size={19} color="#5c4a35" />
              {unreadCount > 0 && <View style={styles.dot}><Text style={styles.dotText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>}
            </TouchableOpacity>
            <TouchableOpacity onPress={openDrawer} style={styles.headerBtn}>
              <Ionicons name="menu-outline" size={22} color="#5c4a35" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <View style={{ flex: 1, flexDirection: 'row', overflow: 'hidden' as any }}>

        {isDesktop && (
          <View style={{ width: 220, backgroundColor: '#fff', borderLeftWidth: 1, borderLeftColor: '#e6e0d8', paddingTop: 20, paddingHorizontal: 10, overflowY: 'auto' as any, flexShrink: 0 }}>
            {sidebarContent}
          </View>
        )}

        <View style={{ flex: 1, overflowY: 'auto' as any, paddingBottom: isDesktop ? 0 : `calc(${BOTTOM_BAR_HEIGHT}px + ${SAI_BOTTOM})` as any }}>
          <View style={{ minHeight: `calc(100vh - ${HEADER_HEIGHT}px)` as any }}>
            {children}
          </View>

          {isDesktop && (
            <View style={{ backgroundColor: '#1a1a2e', paddingVertical: 40, paddingHorizontal: 48, direction: 'rtl' as any }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 32, maxWidth: 1200, alignSelf: 'center' as any, width: '100%' as any }}>
                <View style={{ gap: 14 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>ابقى على تواصل معنا</Text>
                  <View style={{ flexDirection: 'row', gap: 14 }}>
                    <TouchableOpacity style={footerStyles.socialBtn} onPress={() => Linking.openURL('https://www.facebook.com/profile.php?id=61587917750474/')}><Text style={footerStyles.socialIcon}>f</Text></TouchableOpacity>
                    <TouchableOpacity style={footerStyles.socialBtn} onPress={() => Linking.openURL('https://www.instagram.com/ardalsharq.1/')}><Ionicons name="logo-instagram" size={16} color="#fff" /></TouchableOpacity>
                  </View>
                </View>
                <View style={{ gap: 12 }}>
                  <TouchableOpacity onPress={() => Linking.openURL('https://api.whatsapp.com/send?phone=%2B962795277537')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                    <Text style={{ fontSize: 13, color: '#e0e0e0' }}>تواصل معنا عبر الواتساب - مندوب عمان</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => Linking.openURL('https://api.whatsapp.com/send?phone=%2B962792881832')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                    <Text style={{ fontSize: 13, color: '#e0e0e0' }}>تواصل معنا عبر الواتساب - مندوب الزرقاء</Text>
                  </TouchableOpacity>
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 6 }}>اتصل بنا للحصول على المساعدة</Text>
                    <TouchableOpacity onPress={() => Linking.openURL('tel:+962795277537')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Ionicons name="call-outline" size={16} color="#fff" />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#e0e0e0' }}>مندوب عمان: +962795277537</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => Linking.openURL('tel:+962792881832')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="call-outline" size={16} color="#fff" />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#e0e0e0' }}>مندوب الزرقاء: +962792881832</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ gap: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>حمّل تطبيقنا</Text>
                  <Text style={{ fontSize: 13, color: '#aaa' }}>قريباً على المتاجر</Text>
                  <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' as any, opacity: 0.5 }}>
                    <View style={footerStyles.appBtn}><Text style={footerStyles.appBtnText}>App Store</Text></View>
                    <View style={footerStyles.appBtn}><Text style={footerStyles.appBtnText}>Google Play</Text></View>
                  </View>
                </View>
              </View>
              <View style={{ borderTopWidth: 1, borderTopColor: '#333', marginTop: 32, paddingTop: 20, alignItems: 'center' as any, gap: 10 }}>
                <TouchableOpacity onPress={() => router.push('/(public)/privacy-policy' as any)}>
                  <Text style={{ fontSize: 13, color: '#aaa', textDecorationLine: 'underline' }}>سياسة الخصوصية</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 12, color: '#888' }}>© 2026 أرض الشرق الحديثة لتجارة المواد الغذائية - جميع الحقوق محفوظة</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* ── Mobile: fixed bottom tab bar ───────────────────────────────── */}
      {!isDesktop && (
        <View style={{
          position: 'fixed' as any, bottom: 0, left: 0, right: 0,
          minHeight: BOTTOM_BAR_HEIGHT + 6, paddingBottom: SAI_BOTTOM as any,
          backgroundColor: '#FFFFFF', borderTopWidth: 3, borderTopColor: ACTIVE_COLOR,
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          flexDirection: 'row', direction: 'rtl' as any, zIndex: 100,
          shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 8,
        }}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.path || (item.path === '/orders' && pathname.startsWith('/orders'));
            return (
              <TouchableOpacity key={item.path} onPress={() => router.push(`/(customer)${item.path}` as any)} activeOpacity={0.75}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 6, cursor: 'pointer' as any }}>
                <View style={{ position: 'relative', ...(isActive ? {
                  backgroundColor: '#FFFFFF', borderRadius: 30, width: 50, height: 50,
                  justifyContent: 'center' as const, alignItems: 'center' as const, marginTop: -30,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                } as any : { justifyContent: 'center' as const, alignItems: 'center' as const }) }}>
                  <Ionicons name={isActive ? item.activeIcon : item.icon} size={isActive ? 26 : 22} color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR} />
                  {item.path === '/cart' && itemCount > 0 && (<View style={styles.dot}><Text style={styles.dotText}>{itemCount > 9 ? '9+' : itemCount}</Text></View>)}
                </View>
                <Text style={{ fontSize: 11, fontWeight: isActive ? '700' : '500', color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR, marginTop: isActive ? 2 : 0 }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── Mobile: slide-in drawer (from the right) ────────────────────── */}
      {!isDesktop && drawerOpen && (
        <View style={{ position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 500 }}>
          {/* Backdrop */}
          <Animated.View style={{ position: 'absolute' as any, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', opacity: overlayAnim }}>
            <Pressable style={{ flex: 1 }} onPress={closeDrawer} />
          </Animated.View>

          {/* Drawer panel */}
          <Animated.View style={{
            position: 'absolute' as any, top: 0, right: 0, bottom: 0, width: DRAWER_WIDTH,
            backgroundColor: '#fff', transform: [{ translateX: drawerAnim }],
            paddingTop: SAI_TOP as any,
            shadowColor: '#000', shadowOffset: { width: -4, height: 0 }, shadowOpacity: 0.2, shadowRadius: 16,
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e6e0d8' }}>
              <TouchableOpacity onPress={closeDrawer} style={{ padding: 4 }}>
                <Ionicons name="close-outline" size={26} color="#5c4a35" />
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1c1917' }}>القائمة</Text>
            </View>

            {/* User greeting */}
            {profile && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff8f3', borderBottomWidth: 1, borderBottomColor: '#e6e0d8' }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#e36523', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>{profile.full_name ? profile.full_name.charAt(0) : '؟'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: '#a09284' }}>أهلاً،</Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#1c1917' }} numberOfLines={1}>{profile.full_name}</Text>
                </View>
              </View>
            )}

            {/* Nav */}
            <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, overflowY: 'auto' as any }}>
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.path || (item.path === '/orders' && pathname.startsWith('/orders'));
                return (
                  <TouchableOpacity key={item.path} onPress={() => navTo(item.path)} activeOpacity={0.75} style={[styles.navItem, isActive && styles.navItemActive]}>
                    <Ionicons name={isActive ? item.activeIcon : item.icon} size={22} color={isActive ? ACTIVE_COLOR : '#857d78'} />
                    <Text style={[styles.navLabel, { color: isActive ? ACTIVE_COLOR : '#5c4a35', fontWeight: isActive ? '700' : '500', fontSize: 15 }]}>{item.label}</Text>
                    {item.path === '/cart' && itemCount > 0 && (<View style={styles.badge}><Text style={styles.badgeText}>{itemCount > 9 ? '9+' : itemCount}</Text></View>)}
                  </TouchableOpacity>
                );
              })}

              <View style={[styles.divider, { marginVertical: 8 }]} />

              <TouchableOpacity onPress={() => { closeDrawer(); setTimeout(() => router.push('/(customer)/contact' as any), 60); }} activeOpacity={0.75}
                style={[styles.navItem, pathname === '/contact' && styles.navItemActive]}>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color={pathname === '/contact' ? '#e36523' : '#857d78'} />
                <Text style={[styles.navLabel, { color: pathname === '/contact' ? '#e36523' : '#5c4a35', fontWeight: pathname === '/contact' ? '700' : '500', fontSize: 15 }]}>تواصل معنا</Text>
              </TouchableOpacity>

              <View style={[styles.divider, { marginVertical: 8 }]} />

              <TouchableOpacity onPress={() => { closeDrawer(); setTimeout(() => signOutMutation.mutate(undefined, { onSuccess: () => router.replace('/(public)/login' as any) }), 60); }}
                activeOpacity={0.75} style={styles.navItem}>
                <Ionicons name="log-out-outline" size={22} color="#ef4444" />
                <Text style={[styles.navLabel, { color: '#ef4444', fontWeight: '500', fontSize: 15 }]}>تسجيل الخروج</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}

    </View>
  );
}

// ── Shared style objects ─────────────────────────────────────────────────────
const styles = {
  headerBtn: { padding: 10, borderRadius: 10, backgroundColor: '#f5f0eb' },
  dot: { position: 'absolute' as const, top: 4, right: 4, backgroundColor: '#e36523', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center' as const, justifyContent: 'center' as const, paddingHorizontal: 3 },
  dotText: { color: '#fff', fontSize: 9, fontWeight: '700' as const },
  divider: { height: 1, backgroundColor: '#e6e0d8', marginHorizontal: 8, marginBottom: 10 },
  navItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, marginBottom: 2, cursor: 'pointer' as any },
  navItemActive: { backgroundColor: '#fff0e8' },
  navLabel: { flex: 1, fontSize: 14 },
  badge: { backgroundColor: '#e36523', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center' as const, justifyContent: 'center' as const, paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' as const },
};

const footerStyles = {
  socialBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#444', alignItems: 'center' as const, justifyContent: 'center' as const },
  socialIcon: { fontSize: 16, color: '#fff' },
  appBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#555', backgroundColor: '#111' },
  appBtnText: { fontSize: 12, fontWeight: '600' as const, color: '#fff' },
};
