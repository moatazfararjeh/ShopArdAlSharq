import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSignOut } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { useAdminOrders } from '@/hooks/useOrders';
import { ADMIN_NAV_GROUPS, activeAdminPath } from '@/lib/adminNav';
import { COLORS } from '@/lib/theme';

const SIDEBAR_W = 248;
const WIDE = 1024; // at or above this width the sidebar is always shown

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return w;
}

export function AdminWebLayout({ children }: { children: React.ReactNode }) {
  const pathname        = usePathname();
  const router          = useRouter();
  const signOutMutation = useSignOut();
  const profile         = useAuthStore((s) => s.profile);
  const wide            = useWindowWidth() >= WIDE;
  const [open, setOpen] = useState(false);
  const active          = activeAdminPath(pathname);
  const { data: pending } = useAdminOrders({ status: 'pending' });
  const pendingCount    = pending?.length ?? 0;

  function go(path: string) {
    router.push(`/(admin)${path}` as any);
    setOpen(false);
  }

  const sidebar = (
    <View style={{
      width: SIDEBAR_W, backgroundColor: '#fff', flexShrink: 0,
      borderLeftWidth: 1, borderLeftColor: COLORS.line, height: '100%' as any,
    }}>
      <ScrollView contentContainerStyle={{ padding: 14, gap: 16 }}>
        {/* Brand */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6, paddingTop: 6 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: COLORS.brand, fontWeight: '700', fontSize: 17 }}>ف</Text>
          </View>
          <View>
            <Text style={{ fontWeight: '700', fontSize: 15, color: COLORS.ink }}>فود بوكس</Text>
            <Text style={{ fontSize: 12, color: COLORS.muted }}>لوحة الإدارة</Text>
          </View>
        </View>

        {/* Grouped navigation */}
        {ADMIN_NAV_GROUPS.map((group) => (
          <View key={group.title} style={{ gap: 2 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.faint, paddingHorizontal: 10, paddingBottom: 4 }}>
              {group.title}
            </Text>
            {group.items.map((item) => {
              const isActive = active === item.path;
              const badge = item.path === '/orders' && pendingCount > 0 ? pendingCount : 0;
              return (
                <TouchableOpacity
                  key={item.path}
                  onPress={() => go(item.path)}
                  activeOpacity={0.75}
                  accessibilityRole="link"
                  accessibilityState={{ selected: isActive }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    paddingHorizontal: 10, paddingVertical: 9, borderRadius: 10,
                    backgroundColor: isActive ? COLORS.brandTint : 'transparent',
                    cursor: 'pointer' as any,
                  }}
                >
                  <Ionicons name={item.icon} size={18} color={isActive ? COLORS.brandText : COLORS.muted} />
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: isActive ? '700' : '500', color: isActive ? COLORS.brandText : COLORS.ink }}>
                    {item.label}
                  </Text>
                  {badge > 0 && (
                    <View style={{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: COLORS.brandFill, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{badge}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Footer actions */}
        <View style={{ gap: 6, borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 12 }}>
          <TouchableOpacity
            onPress={() => { router.push('/(customer)/home' as any); setOpen(false); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line }}
          >
            <Ionicons name="storefront-outline" size={18} color={COLORS.ink} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.ink }}>عرض المتجر</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { signOutMutation.mutate(undefined, { onSuccess: () => router.replace('/(public)/login' as any) }); setOpen(false); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10 }}
          >
            <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.danger }}>تسجيل الخروج</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1, flexDirection: 'row', overflow: 'hidden' as any, backgroundColor: COLORS.surface, direction: 'rtl' as any }}>
      {/* Wide screens: sidebar always visible (first child → right side in RTL) */}
      {wide && sidebar}

      {/* Content */}
      <View style={{ flex: 1, flexDirection: 'column', overflow: 'hidden' as any }}>
        <View style={{
          backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.line,
          paddingHorizontal: 20, height: 56, flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          {!wide && (
            <TouchableOpacity
              onPress={() => setOpen(true)}
              accessibilityLabel="القائمة"
              style={{ width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="menu" size={22} color={COLORS.ink} />
            </TouchableOpacity>
          )}
          <Text style={{ flex: 1, fontSize: 14, color: COLORS.muted }}>
            {profile?.full_name ?? 'المدير'} · أرض الشرق
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.green }} />
            <Text style={{ fontSize: 12, color: COLORS.muted }}>متصل</Text>
          </View>
        </View>

        <View style={{ flex: 1, overflowY: 'auto' as any }}>
          {children}
        </View>
      </View>

      {/* Narrow screens: slide-over sidebar */}
      {!wide && open && (
        <View style={{ position: 'fixed' as any, top: 0, bottom: 0, left: 0, right: 0, zIndex: 500, flexDirection: 'row' }}>
          {sidebar}
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(28,25,23,0.45)' }} onPress={() => setOpen(false)} accessibilityLabel="إغلاق القائمة" />
        </View>
      )}
    </View>
  );
}
