import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useAdminOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { formatPrice } from '@/utils/formatPrice';
import { formatDate } from '@/utils/formatDate';
import { Order, OrderSource, ORDER_SOURCE_LABELS } from '@/types/models';
import { OrderStatus } from '@/types/database.types';
import { ORDER_STATUS_LABELS } from '@/lib/constants';
import { COLORS } from '@/lib/theme';

// ─── Status pipeline ──────────────────────────────────────────────────────────
const PIPELINE: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];

function nextStatus(current: OrderStatus): OrderStatus | null {
  const idx = PIPELINE.indexOf(current);
  if (idx === -1 || idx === PIPELINE.length - 1) return null;
  return PIPELINE[idx + 1];
}

// ─── Pipeline progress (thin bar) ─────────────────────────────────────────────
function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === 'cancelled') return null;
  const idx = PIPELINE.indexOf(status);
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {PIPELINE.map((step, i) => (
        <View key={step} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= idx ? COLORS.green : COLORS.line }} />
      ))}
    </View>
  );
}

// ─── Order source ─────────────────────────────────────────────────────────────
const SOURCE_ICONS: Record<OrderSource, keyof typeof Ionicons.glyphMap> = {
  web: 'globe-outline',
  ios: 'logo-apple',
  android: 'logo-android',
};

/** "آيفون · 1.9.0 (44)" — or "غير معروف" for orders placed before tracking. */
function SourceTag({ order }: { order: Order }) {
  const src = order.source;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name={src ? SOURCE_ICONS[src] : 'help-circle-outline'} size={13} color={COLORS.muted} />
      <Text style={{ fontSize: 12, color: COLORS.muted }} numberOfLines={1}>
        {src ? ORDER_SOURCE_LABELS[src] : 'غير معروف'}{order.app_version && src !== 'web' ? ` · ${order.app_version}` : ''}
      </Text>
    </View>
  );
}

type SourceFilter = OrderSource | 'all' | 'unknown';
const SOURCE_TABS: Array<{ key: SourceFilter; label: string }> = [
  { key: 'all', label: 'كل المصادر' },
  { key: 'web', label: ORDER_SOURCE_LABELS.web },
  { key: 'ios', label: ORDER_SOURCE_LABELS.ios },
  { key: 'android', label: ORDER_SOURCE_LABELS.android },
  { key: 'unknown', label: 'غير معروف' },
];

// ─── Order card ───────────────────────────────────────────────────────────────
function OrderCard({ item, onCancel }: { item: Order; onCancel: (o: Order) => void }) {
  const router = useRouter();
  const updateStatus = useUpdateOrderStatus();
  const next = nextStatus(item.status);
  const statusInfo = ORDER_STATUS_LABELS[item.status];
  const customer = item.profile?.company_name || item.profile?.full_name || '—';
  const contact = item.profile?.company_name ? item.profile?.full_name : item.profile?.phone;
  const open = item.status !== 'delivered' && item.status !== 'cancelled';

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, marginVertical: 5, padding: 14, gap: 10 }}>
      {/* Customer + status */}
      <TouchableOpacity
        onPress={() => router.push(`/(customer)/orders/${item.id}` as any)}
        activeOpacity={0.75}
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.ink }} numberOfLines={1}>{customer}</Text>
          <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }} numberOfLines={1}>
            {item.order_number}{contact ? ` · ${contact}` : ''}
          </Text>
        </View>
        <View style={{ borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: statusInfo.color + '1F' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: statusInfo.color }}>{statusInfo.ar}</Text>
        </View>
      </TouchableOpacity>

      {/* Total / items / date */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.ink }}>{formatPrice(item.total_amount)}</Text>
        <View style={{ flex: 1 }} />
        <Text style={{ fontSize: 12, color: COLORS.muted }}>{item.items?.length ?? 0} منتج · {formatDate(item.created_at)}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -4 }}>
        <SourceTag order={item} />
      </View>

      <OrderProgress status={item.status} />

      {/* Actions */}
      {open && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {next && (
            <TouchableOpacity
              onPress={() => updateStatus.mutate({ id: item.id, status: next })}
              disabled={updateStatus.isPending}
              activeOpacity={0.8}
              style={{
                flex: 1, height: 40, borderRadius: 10, backgroundColor: COLORS.brandFill,
                alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6,
              }}
            >
              {updateStatus.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>نقل إلى: {ORDER_STATUS_LABELS[next].ar}</Text>}
            </TouchableOpacity>
          )}
          {['pending', 'confirmed'].includes(item.status) && (
            <TouchableOpacity
              onPress={() => router.push(`/(admin)/orders/${item.id}/edit` as any)}
              accessibilityLabel="تعديل الطلب"
              style={{ height: 40, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 }}
            >
              <Ionicons name="create-outline" size={16} color={COLORS.ink} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.ink }}>تعديل</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => onCancel(item)}
            disabled={updateStatus.isPending}
            style={{ height: 40, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.danger }}>إلغاء</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Status filter tabs ───────────────────────────────────────────────────────
const FILTER_TABS: Array<{ key: OrderStatus | 'all' | 'open'; label: string }> = [
  { key: 'open',      label: 'المفتوحة'   },
  { key: 'pending',   label: 'بانتظار التأكيد' },
  { key: 'confirmed', label: 'مؤكد'   },
  { key: 'preparing', label: 'قيد التجهيز' },
  { key: 'shipped',   label: 'في الطريق'   },
  { key: 'delivered', label: 'مُسلَّم' },
  { key: 'cancelled', label: 'ملغي'   },
  { key: 'all',       label: 'الكل'   },
];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AdminOrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const updateStatus = useUpdateOrderStatus();
  const [activeFilter, setActiveFilter] = useState<OrderStatus | 'all' | 'open'>('open');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [query, setQuery] = useState('');

  const { data: allOrders, isLoading } = useAdminOrders();

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: allOrders?.length ?? 0, open: 0 };
    allOrders?.forEach((o) => {
      c[o.status] = (c[o.status] ?? 0) + 1;
      if (o.status !== 'delivered' && o.status !== 'cancelled') c.open += 1;
    });
    return c;
  }, [allOrders]);

  const displayOrders = useMemo(() => {
    let list = allOrders ?? [];
    if (activeFilter === 'open') list = list.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
    else if (activeFilter !== 'all') list = list.filter((o) => o.status === activeFilter);
    if (sourceFilter === 'unknown') list = list.filter((o) => !o.source);
    else if (sourceFilter !== 'all') list = list.filter((o) => o.source === sourceFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((o) => [o.order_number, o.profile?.full_name, o.profile?.company_name, o.profile?.phone, o.profile?.email]
        .some((v) => (v ?? '').toLowerCase().includes(q)));
    }
    return list;
  }, [allOrders, activeFilter, sourceFilter, query]);

  const sourceCounts = useMemo(() => {
    const c: Record<SourceFilter, number> = { all: allOrders?.length ?? 0, web: 0, ios: 0, android: 0, unknown: 0 };
    allOrders?.forEach((o) => { c[o.source ?? 'unknown'] += 1; });
    return c;
  }, [allOrders]);

  async function cancelOrder(o: Order) {
    const ok = await confirm({
      title: 'إلغاء الطلب',
      message: `هل تريد إلغاء الطلب ${o.order_number}${o.profile?.full_name ? ` للعميل ${o.profile.full_name}` : ''}؟ لا يمكن التراجع عن الإلغاء.`,
      confirmText: 'إلغاء الطلب',
      cancelText: 'رجوع',
      destructive: true,
    });
    if (ok) updateStatus.mutate({ id: o.id, status: 'cancelled' });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface, direction: 'rtl' as any }}>
      {dialog}
      {/* Header */}
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.line }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard')}
            accessibilityLabel="رجوع"
            style={{ width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="arrow-forward" size={20} color={COLORS.ink} />
          </TouchableOpacity>
          <Text style={{ flex: 1, fontSize: 19, fontWeight: '700', color: COLORS.ink }}>{t('admin.manageOrders')}</Text>
          <Text style={{ fontSize: 13, color: COLORS.muted }}>{displayOrders.length} طلب</Text>
        </View>

        <View style={{ height: 44, borderRadius: 12, backgroundColor: COLORS.surface, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 }}>
          <Ionicons name="search-outline" size={18} color={COLORS.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="رقم الطلب، اسم العميل، الشركة أو الهاتف"
            placeholderTextColor={COLORS.muted}
            style={{ flex: 1, fontSize: 14, color: COLORS.ink, textAlign: 'right' } as any}
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="مسح البحث">
              <Ionicons name="close-circle" size={18} color={COLORS.faint} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: 'row' }}>
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            const count = counts[tab.key] ?? 0;
            if (count === 0 && !['all', 'open'].includes(tab.key) && !isActive) return null;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveFilter(tab.key)}
                activeOpacity={0.8}
                accessibilityState={{ selected: isActive }}
                style={{
                  height: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 18,
                  backgroundColor: isActive ? COLORS.ink : '#fff', borderWidth: 1, borderColor: isActive ? COLORS.ink : COLORS.line,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: isActive ? '700' : '500', color: isActive ? '#fff' : COLORS.ink }}>{tab.label}</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: isActive ? '#fff' : COLORS.muted }}>{count}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Source filter — smaller chips under the status ones */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, flexDirection: 'row' }}>
          {SOURCE_TABS.map((tab) => {
            const isActive = sourceFilter === tab.key;
            const count = sourceCounts[tab.key] ?? 0;
            if (count === 0 && tab.key !== 'all' && !isActive) return null;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setSourceFilter(tab.key)}
                activeOpacity={0.8}
                accessibilityState={{ selected: isActive }}
                style={{
                  height: 30, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, borderRadius: 15,
                  backgroundColor: isActive ? COLORS.brandTint : '#fff', borderWidth: 1, borderColor: isActive ? COLORS.brand : COLORS.line,
                }}
              >
                {tab.key !== 'all' && (
                  <Ionicons name={tab.key === 'unknown' ? 'help-circle-outline' : SOURCE_ICONS[tab.key]} size={13} color={isActive ? COLORS.brandText : COLORS.muted} />
                )}
                <Text style={{ fontSize: 12, fontWeight: isActive ? '700' : '500', color: isActive ? COLORS.brandText : COLORS.ink }}>{tab.label}</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: isActive ? COLORS.brandText : COLORS.muted }}>{count}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Order list */}
      <FlatList
        data={displayOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OrderCard item={item} onCancel={cancelOrder} />}
        contentContainerStyle={{ paddingVertical: 10, paddingBottom: 40 }}
        ListHeaderComponent={
          isLoading ? (
            <View style={{ padding: 16, gap: 10 }}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10 }}>
                  <Skeleton width={140} height={16} borderRadius={6} />
                  <Skeleton width={100} height={12} borderRadius={5} />
                  <Skeleton height={4} borderRadius={2} />
                  <Skeleton height={40} borderRadius={10} />
                </View>
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={{ paddingTop: 80, alignItems: 'center', gap: 10 }}>
              <Ionicons name="receipt-outline" size={48} color={COLORS.faint} />
              <Text style={{ color: COLORS.muted, fontSize: 15, fontWeight: '600' }}>
                {query ? 'لا توجد طلبات مطابقة للبحث' : 'لا توجد طلبات هنا'}
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
