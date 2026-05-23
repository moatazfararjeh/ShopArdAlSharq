import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSignOut } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';

const ADMIN_NAV = [
  { label: 'لوحة التحكم', icon: 'grid-outline'    as const, activeIcon: 'grid'    as const, path: '/dashboard' },
  { label: 'المنتجات',    icon: 'cube-outline'    as const, activeIcon: 'cube'    as const, path: '/products'  },
  { label: 'الفئات',      icon: 'list-outline'    as const, activeIcon: 'list'    as const, path: '/categories'},
  { label: 'الطلبات',     icon: 'receipt-outline' as const, activeIcon: 'receipt' as const, path: '/orders'    },
  { label: 'البانرات',    icon: 'images-outline'  as const, activeIcon: 'images'  as const, path: '/banners'   },
  { label: 'المستخدمون',  icon: 'people-outline'  as const, activeIcon: 'people'  as const, path: '/users'     },
];

export function AdminWebLayout({ children }: { children: React.ReactNode }) {
  const pathname        = usePathname();
  const router          = useRouter();
  const signOutMutation = useSignOut();
  const profile         = useAuthStore((s) => s.profile);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <View style={{ flex: 1, flexDirection: 'row', overflow: 'hidden' as any }}>

      {/* ── Content area — left side ─────────────────────────────────────── */}
      <View style={{ flex: 1, flexDirection: 'column', overflow: 'hidden' as any }}>
        {/* Sticky top bar */}
        <View
          style={{
            backgroundColor: '#fff',
            borderBottomWidth: 1,
            borderBottomColor: '#e6e0d8',
            paddingHorizontal: 24,
            height: 56,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: '#16a34a',
              }}
            />
            <Text style={{ fontSize: 12, color: '#857d78' }}>متصل</Text>
          </View>
          <Text style={{ fontSize: 14, color: '#5c4a35', fontWeight: '500' }}>
            {profile?.full_name ?? 'المدير'} · أرض الشرق
          </Text>
          <TouchableOpacity
            onPress={() => setSidebarOpen((v) => !v)}
            activeOpacity={0.7}
            style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#f3f0ec', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name={sidebarOpen ? 'close-outline' : 'menu-outline'} size={20} color="#5c4a35" />
          </TouchableOpacity>
        </View>

        {/* Page content */}
        <View style={{ flex: 1, overflowY: 'auto' as any }}>
          {children}
        </View>
      </View>

      {/* ── Dark sidebar — right side ─────────────────────────────────────── */}
      {sidebarOpen && (
      <View
        style={{
          width: 240,
          backgroundColor: '#1e1a17',
          flexShrink: 0,
          flexDirection: 'column',
          overflowY: 'auto' as any,
          borderLeftWidth: 1,
          borderLeftColor: '#2e2924',
        }}
      >
        {/* Brand */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 20,
            borderBottomWidth: 1,
            borderBottomColor: '#2e2924',
          }}
        >
          <Image
            source={require('@/assets/logo.png')}
            style={{ width: 180, height: 60 }}
            contentFit="contain"
          />
          <View
            style={{
              marginTop: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: '#e36523',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="shield-checkmark" size={13} color="#fff" />
            </View>
            <Text style={{ color: '#a09284', fontSize: 12, fontWeight: '600' }}>
              لوحة الإدارة
            </Text>
          </View>
        </View>

        {/* Nav items */}
        <View style={{ flex: 1, paddingHorizontal: 10, paddingTop: 14 }}>
          {ADMIN_NAV.map((item) => {
            const isActive =
              pathname === item.path || pathname.startsWith(item.path + '/');

            return (
              <TouchableOpacity
                key={item.path}
                onPress={() => { router.push(`/(admin)${item.path}` as any); setSidebarOpen(false); }}
                activeOpacity={0.75}
                style={[
                  styles.navItem,
                  isActive && styles.navItemActive,
                ]}
              >
                <Ionicons
                  name={isActive ? item.activeIcon : item.icon}
                  size={18}
                  color={isActive ? '#e36523' : '#a09284'}
                />
                <Text
                  style={[
                    styles.navLabel,
                    { color: isActive ? '#f5f0eb' : '#a09284', fontWeight: isActive ? '700' : '400' },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom actions */}
        <View style={{ paddingHorizontal: 10, paddingBottom: 24 }}>
          <View style={styles.divider} />
          <TouchableOpacity
            onPress={() => { router.push('/(customer)/home' as any); setSidebarOpen(false); }}
            activeOpacity={0.75}
            style={styles.navItem}
          >
            <Ionicons name="storefront-outline" size={18} color="#a09284" />
            <Text style={[styles.navLabel, { color: '#a09284' }]}>عرض المتجر</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { signOutMutation.mutate(); setSidebarOpen(false); }}
            activeOpacity={0.75}
            style={styles.navItem}
          >
            <Ionicons name="log-out-outline" size={18} color="#a09284" />
            <Text style={[styles.navLabel, { color: '#a09284' }]}>تسجيل الخروج</Text>
          </TouchableOpacity>
        </View>
      </View>
      )}

    </View>
  );
}

// ── Shared style objects ─────────────────────────────────────────────────────
const styles = {
  divider: {
    height: 1,
    backgroundColor: '#2e2924',
    marginHorizontal: 4,
    marginBottom: 8,
  },
  navItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 2,
    cursor: 'pointer' as any,
  },
  navItemActive: {
    backgroundColor: 'rgba(227, 101, 35, 0.15)',
    borderStartWidth: 3,
    borderStartColor: '#e36523',
  },
  navLabel: {
    fontSize: 14,
  },
};
