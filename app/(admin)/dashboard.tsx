import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAdminOrders } from '@/hooks/useOrders';
import { formatPrice } from '@/utils/formatPrice';
import type { OrderStatus } from '@/types/database.types';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  headerBg: '#0d1b2a',
  surface:  '#f0f4f8',
  card:     '#ffffff',
  brand:    '#e36523',
  text:     '#1e293b',
  muted:    '#64748b',
};

// ─── Action grid config ───────────────────────────────────────────────────────
const ACTIONS: Array<{
  label: string;
  route: string;
  icon: string;
  color: string;
  bg: string;
}> = [
  { label: 'الطلبات',          route: '/(admin)/orders/',            icon: 'receipt-outline',    color: '#3b82f6', bg: '#eff6ff' },
  { label: 'المنتجات',         route: '/(admin)/products/',          icon: 'cube-outline',       color: C.brand,   bg: '#fff7ed' },
  { label: 'التحليلات',        route: '/(admin)/analytics',          icon: 'bar-chart-outline',  color: '#8b5cf6', bg: '#f5f3ff' },
  { label: 'الفئات',           route: '/(admin)/categories/',        icon: 'grid-outline',       color: '#10b981', bg: '#ecfdf5' },
  { label: 'الماركات',         route: '/(admin)/brands/',            icon: 'ribbon-outline',     color: '#f59e0b', bg: '#fffbeb' },
  { label: 'البانرات',         route: '/(admin)/banners/',           icon: 'images-outline',     color: '#06b6d4', bg: '#ecfeff' },
  { label: 'إشعار ترويجي',    route: '/(admin)/send-notification',  icon: 'megaphone-outline',  color: '#ec4899', bg: '#fdf2f8' },
  { label: 'إحصاء الإشعار',   route: '/(admin)/notification-stats', icon: 'stats-chart-outline',color: C.muted,   bg: '#f1f5f9' },
  { label: 'الحسابات',         route: '/(admin)/users/',             icon: 'people-outline',     color: '#ef4444', bg: '#fff1f2' },
];

export default function AdminDashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const W = Math.min(Dimensions.get('window').width, 520);
  // 3 columns: total width − 2×16px padding − 2×10px gaps
  const COL = (W - 32 - 20) / 3;

  const { data: allOrders } = useAdminOrders();
  const { data: pendingOrders } = useAdminOrders({ status: 'pending' as OrderStatus });

  const totalRevenue = allOrders
    ?.filter((o) => o.status === 'delivered')
    .reduce((s, o) => s + o.total_amount, 0) ?? 0;
  const deliveredCount = allOrders?.filter((o) => o.status === 'delivered').length ?? 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.headerBg }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: C.surface }}>

        {/* ── Dark admin header ────────────────────────────────── */}
        <View style={{ backgroundColor: C.headerBg, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>
                لوحة التحكم
              </Text>
              <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                {new Date().toLocaleDateString('ar-SA', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => router.push('/(customer)/home' as any)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                paddingHorizontal: 12, paddingVertical: 7,
                backgroundColor: '#ffffff12', borderRadius: 20,
                borderWidth: 1, borderColor: '#ffffff1c',
              }}
            >
              <Ionicons name="storefront-outline" size={14} color={C.brand} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.brand }}>المتجر</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── KPI strip ────────────────────────────────────────── */}
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }}>
            {[
              { label: 'الطلبات',  value: allOrders?.length ?? 0,     color: C.brand,    bg: '#fff7ed' },
              { label: 'معلق',     value: pendingOrders?.length ?? 0,  color: '#f59e0b',  bg: '#fffbeb' },
              { label: 'مُسلَّم',  value: deliveredCount,              color: '#16a34a',  bg: '#f0fdf4' },
              { label: 'الإيراد',  value: formatPrice(totalRevenue),   color: '#3b82f6',  bg: '#eff6ff' },
            ].map((k) => (
              <View
                key={k.label}
                style={{
                  flex: 1, backgroundColor: k.bg, borderRadius: 16,
                  paddingVertical: 14, paddingHorizontal: 4, alignItems: 'center',
                  shadowColor: '#0d1b2a', shadowOpacity: 0.08,
                  shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 4,
                }}
              >
                <Text
                  style={{ fontSize: 15, fontWeight: '900', color: k.color }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {k.value}
                </Text>
                <Text style={{ fontSize: 10, color: C.muted, marginTop: 3, textAlign: 'center' }}>
                  {k.label}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Section label ─────────────────────────────────────── */}
          <Text style={{
            fontSize: 11, fontWeight: '700', color: C.muted,
            textAlign: 'right', paddingHorizontal: 20,
            paddingTop: 24, paddingBottom: 12, letterSpacing: 1,
          }}>
            إدارة سريعة
          </Text>

          {/* ── 3-column icon grid ────────────────────────────────── */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 }}>
            {ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.route}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.72}
                style={{
                  width: COL,
                  paddingVertical: 18, paddingHorizontal: 6,
                  backgroundColor: C.card, borderRadius: 20,
                  alignItems: 'center', gap: 8,
                  shadowColor: '#1e293b', shadowOpacity: 0.06,
                  shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3,
                }}
              >
                <View style={{
                  width: 46, height: 46, borderRadius: 15,
                  backgroundColor: action.bg,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name={action.icon as any} size={22} color={action.color} />
                </View>
                <Text
                  style={{ fontSize: 11, fontWeight: '700', color: C.text, textAlign: 'center', lineHeight: 16 }}
                  numberOfLines={2}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Pending orders preview ────────────────────────────── */}
          {(pendingOrders?.length ?? 0) > 0 && (
            <>
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20, paddingTop: 28, paddingBottom: 12,
              }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 1 }}>
                  طلبات معلقة
                </Text>
                <TouchableOpacity onPress={() => router.push('/(admin)/orders/' as any)}>
                  <Text style={{ fontSize: 12, color: C.brand, fontWeight: '700' }}>→ عرض الكل</Text>
                </TouchableOpacity>
              </View>

              {pendingOrders!.slice(0, 3).map((order) => (
                <TouchableOpacity
                  key={order.id}
                  onPress={() => router.push(`/(customer)/orders/${order.id}` as any)}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    marginHorizontal: 16, marginBottom: 8,
                    backgroundColor: C.card, borderRadius: 14, padding: 14,
                    shadowColor: '#1e293b', shadowOpacity: 0.05,
                    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
                  }}
                >
                  <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#f59e0b', marginLeft: 10 }} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.brand }}>
                    #{order.order_number}
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: C.text }}>
                    {formatPrice(order.total_amount)}
                  </Text>
                  <Ionicons name="chevron-back" size={14} color="#cbd5e1" style={{ marginRight: 4 }} />
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
