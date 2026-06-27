import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
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

const ACTIVE_COLOR = '#e36523';
const INACTIVE_COLOR = '#857d78';

const DESKTOP_BREAKPOINT = 768;
const HEADER_HEIGHT      = 70;
const BOTTOM_BAR_HEIGHT  = 64;

function getBrowserWidth(): number {
  if (typeof window !== 'undefined') return window.innerWidth;
  return 1200;
}

export function CustomerWebLayout({ children }: { children: React.ReactNode }) {
  const pathname        = usePathname();
  const router          = useRouter();
  const itemCount       = useCartStore((s) => s.summary.itemCount);
  const unreadCount     = useUnreadCount();
  const signOutMutation = useSignOut();
  const profile         = useAuthStore((s) => s.profile);

  const [winWidth, setWinWidth] = useState<number>(getBrowserWidth);

  useEffect(() => {
    const handler = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const isDesktop = winWidth >= DESKTOP_BREAKPOINT;

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
          <TouchableOpacity
            key={item.path}
            onPress={() => router.push(`/(customer)${item.path}` as any)}
            activeOpacity={0.75}
            style={[styles.navItem, isActive && styles.navItemActive]}
          >
            <Ionicons name={isActive ? item.activeIcon : item.icon} size={20} color={isActive ? ACTIVE_COLOR : '#857d78'} />
            <Text style={[styles.navLabel, { color: isActive ? ACTIVE_COLOR : '#5c4a35', fontWeight: isActive ? '700' : '500' }]}>
              {item.label}
            </Text>
            {item.path === '/cart' && itemCount > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{itemCount > 9 ? '9+' : itemCount}</Text></View>
            )}
          </TouchableOpacity>
        );
      })}

      <View style={[styles.divider, { marginTop: 12 }]} />

      <TouchableOpacity
        onPress={() => router.push('/(customer)/contact' as any)}
        activeOpacity={0.75}
        style={[styles.navItem, pathname === '/contact' && styles.navItemActive]}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={20} color={pathname === '/contact' ? '#e36523' : '#857d78'} />
        <Text style={[styles.navLabel, { color: pathname === '/contact' ? '#e36523' : '#5c4a35', fontWeight: pathname === '/contact' ? '700' : '500' }]}>
          تواصل معنا
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => signOutMutation.mutate()} activeOpacity={0.75} style={styles.navItem}>
        <Ionicons name="log-out-outline" size={20} color="#857d78" />
        <Text style={[styles.navLabel, { color: '#857d78' }]}>تسجيل الخروج</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <View style={{ flex: 1, flexDirection: 'column', backgroundColor: '#f8f7f5' }}>

      {/* ── Sticky top header ───────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#e6e0d8',
          paddingHorizontal: isDesktop ? 32 : 16,
          height: HEADER_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          direction: 'ltr' as any,
          position: 'sticky' as any,
          top: 0,
          zIndex: 100,
          flexShrink: 0,
        }}
      >
        <TouchableOpacity onPress={() => router.push('/(customer)/home' as any)} activeOpacity={0.8} style={{ overflow: 'hidden', height: HEADER_HEIGHT - 10, justifyContent: 'center' }}>
          <Image source={require('@/assets/logo.png')} style={{ width: isDesktop ? 180 : 140, height: HEADER_HEIGHT - 10 }} contentFit="contain" />
        </TouchableOpacity>

        {/* Desktop: action icons */}
        {isDesktop && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={() => router.push('/(customer)/search' as any)} style={styles.headerBtn}>
              <Ionicons name="search-outline" size={20} color="#5c4a35" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(customer)/notifications' as any)} style={[styles.headerBtn, { position: 'relative' }]}>
              <Ionicons name="notifications-outline" size={20} color="#5c4a35" />
              {unreadCount > 0 && (
                <View style={styles.dot}><Text style={styles.dotText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(customer)/cart' as any)} style={[styles.headerBtn, { position: 'relative' }]}>
              <Ionicons name="bag-outline" size={20} color="#5c4a35" />
              {itemCount > 0 && (
                <View style={styles.dot}><Text style={styles.dotText}>{itemCount > 9 ? '9+' : itemCount}</Text></View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Mobile: search + notifications + cart in header */}
        {!isDesktop && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity onPress={() => router.push('/(customer)/search' as any)} style={styles.headerBtn}>
              <Ionicons name="search-outline" size={19} color="#5c4a35" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(customer)/notifications' as any)} style={[styles.headerBtn, { position: 'relative' }]}>
              <Ionicons name="notifications-outline" size={19} color="#5c4a35" />
              {unreadCount > 0 && (
                <View style={styles.dot}><Text style={styles.dotText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <View style={{ flex: 1, flexDirection: 'row', overflow: 'hidden' as any }}>

        {/* Content — extra bottom padding on mobile so it clears the bottom bar */}
        <View style={{ flex: 1, overflowY: 'auto' as any, paddingBottom: isDesktop ? 0 : BOTTOM_BAR_HEIGHT }}>
          <View style={{ minHeight: `calc(100vh - ${HEADER_HEIGHT}px)` as any }}>
            {children}
          </View>

          {/* ── Footer (desktop only) ────────────────────────────────── */}
          {isDesktop && <View style={{ backgroundColor: '#1a1a2e', paddingVertical: 40, paddingHorizontal: 48, direction: 'rtl' as any }}>
            <View style={{ flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', gap: 32, maxWidth: 1200, alignSelf: 'center' as any, width: '100%' as any }}>

              {/* Social media */}
              <View style={{ gap: 14, alignItems: isDesktop ? 'flex-start' as any : 'center' as any }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>ابقى على تواصل معنا</Text>
                <View style={{ flexDirection: 'row', gap: 14 }}>
                  <TouchableOpacity style={footerStyles.socialBtn} onPress={() => Linking.openURL('https://www.facebook.com/profile.php?id=61587917750474/')}><Text style={footerStyles.socialIcon}>f</Text></TouchableOpacity>
                </View>
              </View>

              {/* Contact info */}
              <View style={{ gap: 12, alignItems: isDesktop ? 'flex-start' as any : 'center' as any }}>
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

              {/* Download app */}
              <View style={{ gap: 12, alignItems: isDesktop ? 'flex-start' as any : 'center' as any }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Download Our App</Text>
                <Text style={{ fontSize: 13, color: '#aaa' }}>قريباً على المتاجر</Text>
                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' as any, justifyContent: isDesktop ? 'flex-start' as any : 'center' as any, opacity: 0.5 }}>
                  <View style={footerStyles.appBtn}><Text style={footerStyles.appBtnText}>App Store</Text></View>
                  <View style={footerStyles.appBtn}><Text style={footerStyles.appBtnText}>Google Play</Text></View>
                </View>
              </View>
            </View>

            {/* Copyright */}
            <View style={{ borderTopWidth: 1, borderTopColor: '#333', marginTop: 32, paddingTop: 20, alignItems: 'center' as any, gap: 10 }}>
              <TouchableOpacity onPress={() => router.push('/(public)/privacy-policy' as any)}>
                <Text style={{ fontSize: 13, color: '#aaa', textDecorationLine: 'underline' }}>سياسة الخصوصية</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 12, color: '#888' }}>© 2026 أرض الشرق جميع الحقوق محفوظة</Text>
            </View>
          </View>}
        </View>

        {/* Desktop: persistent right sidebar */}
        {isDesktop && (
          <View
            style={{
              width: 220,
              backgroundColor: '#fff',
              borderLeftWidth: 1,
              borderLeftColor: '#e6e0d8',
              paddingTop: 20,
              paddingHorizontal: 10,
              overflowY: 'auto' as any,
              flexShrink: 0,
            }}
          >
            {sidebarContent}
          </View>
        )}
      </View>

      {/* ── Mobile: fixed bottom tab bar ───────────────────────────────── */}
      {!isDesktop && (
        <View
          style={{
            position: 'fixed' as any,
            bottom: 0,
            left: 0,
            right: 0,
            height: BOTTOM_BAR_HEIGHT + 6,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 3,
            borderTopColor: ACTIVE_COLOR,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            flexDirection: 'row',
            direction: 'rtl' as any,
            zIndex: 100,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.path || (item.path === '/orders' && pathname.startsWith('/orders'));
            return (
              <TouchableOpacity
                key={item.path}
                onPress={() => router.push(`/(customer)${item.path}` as any)}
                activeOpacity={0.75}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 6, cursor: 'pointer' as any }}
              >
                <View style={{ position: 'relative', ...(
                  isActive
                    ? {
                        backgroundColor: '#FFFFFF',
                        borderRadius: 30,
                        width: 50,
                        height: 50,
                        justifyContent: 'center' as const,
                        alignItems: 'center' as const,
                        marginTop: -30,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.15,
                        shadowRadius: 6,
                        // Web box-shadow fallback
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      } as any
                    : { justifyContent: 'center' as const, alignItems: 'center' as const }
                  )
                }}>
                  <Ionicons
                    name={isActive ? item.activeIcon : item.icon}
                    size={isActive ? 26 : 22}
                    color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR}
                  />
                  {item.path === '/cart' && itemCount > 0 && (
                    <View style={styles.dot}><Text style={styles.dotText}>{itemCount > 9 ? '9+' : itemCount}</Text></View>
                  )}
                </View>
                <Text style={{ fontSize: 11, fontWeight: isActive ? '700' : '500', color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR, marginTop: isActive ? 2 : 0 }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

    </View>
  );
}

// ── Shared style objects ─────────────────────────────────────────────────────
const styles = {
  headerBtn: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f5f0eb',
  },
  dot: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    backgroundColor: '#e36523',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 3,
  },
  dotText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700' as const,
  },
  divider: {
    height: 1,
    backgroundColor: '#e6e0d8',
    marginHorizontal: 8,
    marginBottom: 10,
  },
  navItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 2,
    cursor: 'pointer' as any,
  },
  navItemActive: {
    backgroundColor: '#fff0e8',
  },
  navLabel: {
    flex: 1,
    fontSize: 14,
  },
  badge: {
    backgroundColor: '#e36523',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700' as const,
  },
};

const footerStyles = {
  socialBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  socialIcon: {
    fontSize: 16,
    color: '#fff',
  },
  appBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
    backgroundColor: '#111',
  },
  appBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
  },
};
