import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCartStore } from '@/stores/cartStore';
import { useSignOut } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { useUnreadCount } from '@/hooks/useNotifications';

const NAV_ITEMS = [
  { label: 'الرئيسية',  icon: 'home-outline'          as const, activeIcon: 'home'          as const, path: '/home' },
  { label: 'المفضلة',  icon: 'heart-outline'          as const, activeIcon: 'heart'          as const, path: '/wishlist' },
  { label: 'السلة',    icon: 'bag-outline'            as const, activeIcon: 'bag'            as const, path: '/cart' },
  { label: 'طلباتي',  icon: 'receipt-outline'        as const, activeIcon: 'receipt'        as const, path: '/orders' },
  { label: 'حسابي',   icon: 'person-outline'         as const, activeIcon: 'person'         as const, path: '/profile' },
];

const DESKTOP_BREAKPOINT = 768;
const HEADER_HEIGHT = 64;

/** Read the real browser viewport width — bypasses React Native's Dimensions which can lag on web. */
function getBrowserWidth(): number {
  if (typeof window !== 'undefined') return window.innerWidth;
  return 1200; // SSR / non-browser default → show desktop layout
}

export function CustomerWebLayout({ children }: { children: React.ReactNode }) {
  const pathname        = usePathname();
  const router          = useRouter();
  const itemCount       = useCartStore((s) => s.summary.itemCount);
  const unreadCount     = useUnreadCount();
  const signOutMutation = useSignOut();
  const profile         = useAuthStore((s) => s.profile);

  // Use window.innerWidth directly so the correct value is read on first render
  const [winWidth, setWinWidth] = useState<number>(getBrowserWidth);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const isDesktop = winWidth >= DESKTOP_BREAKPOINT;

  // Close drawer on navigation or when viewport grows to desktop
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => { if (isDesktop) setMenuOpen(false); }, [isDesktop]);

  // ── Inline sidebar content (not a nested component — avoids React remount) ──
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
        const isActive =
          pathname === item.path ||
          (item.path === '/orders' && pathname.startsWith('/orders'));

        return (
          <TouchableOpacity
            key={item.path}
            onPress={() => router.push(`/(customer)${item.path}` as any)}
            activeOpacity={0.75}
            style={[styles.navItem, isActive && styles.navItemActive]}
          >
            <Ionicons name={isActive ? item.activeIcon : item.icon} size={20} color={isActive ? '#e36523' : '#857d78'} />
            <Text style={[styles.navLabel, { color: isActive ? '#e36523' : '#5c4a35', fontWeight: isActive ? '700' : '500' }]}>
              {item.label}
            </Text>
            {item.path === '/cart' && itemCount > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{itemCount > 9 ? '9+' : itemCount}</Text></View>
            )}
          </TouchableOpacity>
        );
      })}

      <View style={[styles.divider, { marginTop: 12 }]} />

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
          position: 'sticky' as any,
          top: 0,
          zIndex: 100,
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <TouchableOpacity onPress={() => router.push('/(customer)/home' as any)} activeOpacity={0.8}>
          <Image source={require('@/assets/logo.png')} style={{ width: 120, height: 40 }} contentFit="contain" />
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

        {/* Mobile: cart badge + burger button */}
        {!isDesktop && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity onPress={() => router.push('/(customer)/cart' as any)} style={[styles.headerBtn, { position: 'relative' }]}>
              <Ionicons name="bag-outline" size={20} color="#5c4a35" />
              {itemCount > 0 && (
                <View style={styles.dot}><Text style={styles.dotText}>{itemCount > 9 ? '9+' : itemCount}</Text></View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMenuOpen((v) => !v)}
              style={styles.headerBtn}
              activeOpacity={0.75}
            >
              <Ionicons name={menuOpen ? 'close' : 'menu'} size={22} color="#5c4a35" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <View style={{ flex: 1, flexDirection: 'row', overflow: 'hidden' as any }}>

        {/* Content */}
        <View style={{ flex: 1, overflowY: 'auto' as any }}>
          {children}
        </View>

        {/* Desktop: persistent sidebar */}
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

        {/* Mobile: overlay backdrop */}
        {!isDesktop && menuOpen && (
          <TouchableOpacity
            onPress={() => setMenuOpen(false)}
            activeOpacity={1}
            style={{
              position: 'fixed' as any,
              top: HEADER_HEIGHT,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.45)',
              zIndex: 50,
            }}
          />
        )}

        {/* Mobile: slide-in drawer */}
        {!isDesktop && menuOpen && (
          <View
            style={{
              position: 'fixed' as any,
              top: HEADER_HEIGHT,
              right: 0,
              bottom: 0,
              width: 280,
              backgroundColor: '#fff',
              borderLeftWidth: 1,
              borderLeftColor: '#e6e0d8',
              paddingTop: 20,
              paddingHorizontal: 10,
              overflowY: 'auto' as any,
              zIndex: 60,
              shadowColor: '#000',
              shadowOpacity: 0.18,
              shadowRadius: 16,
              shadowOffset: { width: -4, height: 0 },
            }}
          >
            {sidebarContent}
          </View>
        )}
      </View>
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
