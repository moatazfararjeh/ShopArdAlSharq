import { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAdminOrders } from '@/hooks/useOrders';
import { useProductsPage } from '@/hooks/useProducts';
import { useAuthStore } from '@/stores/authStore';
import { formatPrice } from '@/utils/formatPrice';
import { ORDER_STATUS_LABELS } from '@/lib/constants';
import { ADMIN_NAV_GROUPS } from '@/lib/adminNav';
import { COLORS } from '@/lib/theme';
import { ORDER_SOURCE_LABELS } from '@/types/models';
import type { Order, OrderSource } from '@/types/models';

// Orders that still need someone to act on them, most urgent first
const ACTIVE_ORDER: Record<string, number> = { pending: 0, confirmed: 1, preparing: 2, shipped: 3 };

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[{ backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10 }, style]}>{children}</View>;
}

function CardTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.ink }}>{title}</Text>
      {!!action && (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.brandText }}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function AdminDashboardScreen() {
  const router  = useRouter();
  const { width } = useWindowDimensions();
  const wide    = width >= 900;
  const profile = useAuthStore((s) => s.profile);

  const { data: orders = [], isLoading: ordersLoading } = useAdminOrders();
  const { data: productsPage, isLoading: productsLoading } = useProductsPage({ availableOnly: false, page: 0, limit: 9999 });
  const products = productsPage?.data ?? [];

  const stats = useMemo(() => {
    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const live = (o: Order) => o.status !== 'cancelled';
    const today = orders.filter((o) => sameDay(new Date(o.created_at), now));
    const yest  = orders.filter((o) => sameDay(new Date(o.created_at), yesterday));
    return {
      todayCount: today.length,
      yestCount: yest.length,
      todayRevenue: today.filter(live).reduce((s, o) => s + Number(o.total_amount), 0),
      pending: orders.filter((o) => o.status === 'pending').length,
      active: orders
        .filter((o) => o.status in ACTIVE_ORDER)
        .sort((a, b) => ACTIVE_ORDER[a.status] - ACTIVE_ORDER[b.status] || +new Date(b.created_at) - +new Date(a.created_at)),
    };
  }, [orders]);

  const health = useMemo(() => {
    const visible = products.filter((p) => p.is_available);
    return [
      { key: 'out',       label: 'نفدت الكمية',  count: visible.filter((p) => p.stock_quantity === 0).length, color: COLORS.danger },
      { key: 'noimage',   label: 'بدون صورة',    count: products.filter((p) => !(p.product_images?.length)).length, color: COLORS.brandText },
      { key: 'nosection', label: 'بدون قسم',     count: products.filter((p) => !p.section_id).length, color: COLORS.brandText },
      { key: 'nobrand',   label: 'بدون ماركة',   count: products.filter((p) => !p.brand_id).length, color: COLORS.muted },
    ];
  }, [products]);

  const outOfStock = health[0].count;
  const dayDiff = stats.todayCount - stats.yestCount;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'صباح الخير' : 'مساء الخير';
  const firstName = profile?.full_name?.split(' ')[0];
  const dateLabel = new Date().toLocaleDateString('ar-JO-u-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long' });

  const kpis = [
    {
      label: 'طلبات اليوم', value: ordersLoading ? '…' : String(stats.todayCount),
      note: dayDiff === 0 ? 'مثل الأمس' : dayDiff > 0 ? `+${dayDiff} عن الأمس` : `${dayDiff} عن الأمس`,
      noteColor: dayDiff > 0 ? COLORS.green : COLORS.muted,
    },
    { label: 'إيراد اليوم', value: ordersLoading ? '…' : formatPrice(stats.todayRevenue), note: 'بدون الطلبات الملغاة', noteColor: COLORS.muted },
    {
      label: 'بانتظار التأكيد', value: ordersLoading ? '…' : String(stats.pending),
      note: stats.pending ? 'تحتاج إجراء الآن' : 'لا شيء معلق', noteColor: stats.pending ? COLORS.brandText : COLORS.green,
      onPress: () => router.push('/(admin)/orders' as any),
    },
    {
      label: 'منتجات نفدت', value: productsLoading ? '…' : String(outOfStock),
      note: `من ${products.length} منتج`, noteColor: outOfStock ? COLORS.danger : COLORS.muted,
      onPress: () => router.push({ pathname: '/(admin)/products', params: { filter: 'out' } } as any),
    },
  ];

  const ordersCard = (
    <Card style={wide ? { flex: 1.6 } : undefined}>
      <CardTitle title="طلبات تحتاج إجراء" action="كل الطلبات" onAction={() => router.push('/(admin)/orders' as any)} />
      {stats.active.length === 0 && !ordersLoading && (
        <Text style={{ fontSize: 13, color: COLORS.muted, paddingVertical: 12 }}>لا توجد طلبات مفتوحة حالياً</Text>
      )}
      {stats.active.slice(0, 6).map((o) => {
        const st = ORDER_STATUS_LABELS[o.status];
        const customer = o.profile?.company_name || o.profile?.full_name || '—';
        return (
          <TouchableOpacity
            key={o.id}
            onPress={() => router.push(`/(customer)/orders/${o.id}` as any)}
            activeOpacity={0.75}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.line }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.ink }} numberOfLines={1}>{customer}</Text>
              <Text style={{ fontSize: 12, color: COLORS.muted }} numberOfLines={1}>{o.order_number} · {o.items?.length ?? 0} منتج</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.ink }}>{formatPrice(o.total_amount)}</Text>
            <View style={{ borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: st.color + '1F' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: st.color }}>{st.ar}</Text>
            </View>
            <Ionicons name="chevron-back" size={16} color={COLORS.faint} />
          </TouchableOpacity>
        );
      })}
    </Card>
  );

  const healthCard = (
    <Card>
      <CardTitle title="صحة الكتالوج" />
      {health.map((h) => (
        <TouchableOpacity
          key={h.key}
          onPress={() => router.push({ pathname: '/(admin)/products', params: { filter: h.key } } as any)}
          activeOpacity={0.75}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, backgroundColor: COLORS.surface }}
        >
          <Text style={{ fontSize: 13, color: COLORS.ink }}>{h.label}</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: h.count ? h.color : COLORS.green }}>
            {productsLoading ? '…' : h.count}
          </Text>
        </TouchableOpacity>
      ))}
    </Card>
  );

  // Orders by where they were placed, last 30 days (cancelled ones left out).
  const sources = useMemo(() => {
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = orders.filter((o) => o.status !== 'cancelled' && +new Date(o.created_at) >= since);
    const rows: Array<{ key: OrderSource | 'unknown'; label: string; icon: keyof typeof Ionicons.glyphMap; count: number; revenue: number }> = [
      { key: 'web',     label: ORDER_SOURCE_LABELS.web,     icon: 'globe-outline',       count: 0, revenue: 0 },
      { key: 'ios',     label: ORDER_SOURCE_LABELS.ios,     icon: 'logo-apple',          count: 0, revenue: 0 },
      { key: 'android', label: ORDER_SOURCE_LABELS.android, icon: 'logo-android',        count: 0, revenue: 0 },
      { key: 'unknown', label: 'غير معروف',                  icon: 'help-circle-outline', count: 0, revenue: 0 },
    ];
    recent.forEach((o) => {
      const row = rows.find((r) => r.key === (o.source ?? 'unknown'))!;
      row.count += 1;
      row.revenue += Number(o.total_amount) || 0;
    });
    return { total: recent.length, rows: rows.filter((r) => r.key !== 'unknown' || r.count > 0) };
  }, [orders]);

  const sourceCard = (
    <Card>
      <CardTitle title="مصدر الطلبات · آخر 30 يوماً" action="الطلبات" onAction={() => router.push('/(admin)/orders' as any)} />
      {sources.rows.map((r) => {
        const pct = sources.total ? Math.round((r.count / sources.total) * 100) : 0;
        return (
          <View key={r.key} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={r.icon} size={16} color={COLORS.ink} />
              <Text style={{ flex: 1, fontSize: 13, color: COLORS.ink }}>{r.label}</Text>
              <Text style={{ fontSize: 12, color: COLORS.muted }}>{formatPrice(r.revenue)}</Text>
              <Text style={{ minWidth: 64, textAlign: 'left', fontSize: 13, fontWeight: '700', color: COLORS.ink }}>
                {ordersLoading ? '…' : `${r.count} · ${pct}%`}
              </Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: COLORS.surface, overflow: 'hidden' }}>
              <View style={{ width: `${pct}%`, height: '100%', borderRadius: 3, backgroundColor: r.key === 'unknown' ? COLORS.faint : COLORS.brand }} />
            </View>
          </View>
        );
      })}
      {sources.rows.some((r) => r.key === 'unknown') && (
        <Text style={{ fontSize: 11, color: COLORS.faint }}>غير معروف = طلبات قبل بدء تسجيل المصدر أو من نسخ تطبيق قديمة.</Text>
      )}
    </Card>
  );

  const shortcuts = (
    <View style={{ gap: 14 }}>
      {ADMIN_NAV_GROUPS.filter((g) => g.title !== 'الرئيسية').map((g) => (
        <View key={g.title} style={{ gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.faint }}>{g.title}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {g.items.map((it) => (
              <TouchableOpacity
                key={it.path}
                onPress={() => router.push(`/(admin)${it.path}` as any)}
                activeOpacity={0.75}
                style={{
                  flexGrow: 1, flexBasis: wide ? 170 : 140, flexDirection: 'row', alignItems: 'center', gap: 8,
                  backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12,
                }}
              >
                <Ionicons name={it.icon} size={18} color={COLORS.brandText} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.ink, flexShrink: 1 }} numberOfLines={2}>{it.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? COLORS.surface : '#fff' }} edges={['top']}>
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.surface }}
        contentContainerStyle={{ padding: wide ? 24 : 16, gap: 16, paddingBottom: 48, direction: 'rtl' as any }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <View>
            <Text style={{ fontSize: wide ? 24 : 20, fontWeight: '700', color: COLORS.ink }}>
              {greeting}{firstName ? `، ${firstName}` : ''}
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.muted, marginTop: 2 }}>{dateLabel} · ملخص اليوم</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {Platform.OS !== 'web' && (
              <TouchableOpacity
                onPress={() => router.push('/(customer)/home' as any)}
                style={{ height: 40, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Ionicons name="storefront-outline" size={16} color={COLORS.ink} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.ink }}>المتجر</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => router.push('/(admin)/products/add' as any)}
              style={{ height: 40, paddingHorizontal: 14, borderRadius: 10, backgroundColor: COLORS.brandFill, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>منتج جديد</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* KPIs */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {kpis.map((k) => (
            <TouchableOpacity
              key={k.label}
              disabled={!k.onPress}
              onPress={k.onPress}
              activeOpacity={0.8}
              style={{ flexGrow: 1, flexBasis: wide ? 200 : 150, backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 4 }}
            >
              <Text style={{ fontSize: 13, color: COLORS.muted }}>{k.label}</Text>
              <Text style={{ fontSize: wide ? 26 : 22, fontWeight: '700', color: COLORS.ink }} numberOfLines={1} adjustsFontSizeToFit>{k.value}</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: k.noteColor }}>{k.note}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Orders + catalog health */}
        {wide ? (
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
            {ordersCard}
            <View style={{ flex: 1, gap: 16 }}>{healthCard}{sourceCard}</View>
          </View>
        ) : (
          <>
            {ordersCard}
            {healthCard}
            {sourceCard}
          </>
        )}

        {/* Shortcuts to every admin page */}
        {shortcuts}
      </ScrollView>
    </SafeAreaView>
  );
}
