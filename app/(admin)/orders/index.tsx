import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAdminOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { formatPrice } from '@/utils/formatPrice';
import { formatDate } from '@/utils/formatDate';
import { Order } from '@/types/models';
import { OrderStatus } from '@/types/database.types';
import { ORDER_STATUS_LABELS } from '@/lib/constants';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  surface:  '#f0f4f8',
  card:     '#ffffff',
  brand:    '#e36523',
  text:     '#1e293b',
  muted:    '#64748b',
  hairline: '#e2e8f0',
};

// ─── Status pipeline ──────────────────────────────────────────────────────────
const PIPELINE: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];

function nextStatus(current: OrderStatus): OrderStatus | null {
  const idx = PIPELINE.indexOf(current);
  if (idx === -1 || idx === PIPELINE.length - 1) return null;
  return PIPELINE[idx + 1];
}

// ─── Order pipeline stepper ───────────────────────────────────────────────────
function OrderStepper({ status }: { status: OrderStatus }) {
  if (status === 'cancelled') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}>
        <Ionicons name="close-circle" size={14} color="#ef4444" />
        <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '700' }}>تم الإلغاء</Text>
      </View>
    );
  }

  const currentIdx = PIPELINE.indexOf(status);
  const dots: React.ReactNode[] = [];

  PIPELINE.forEach((step, idx) => {
    const done = idx <= currentIdx;
    const color = ORDER_STATUS_LABELS[step].color;
    dots.push(
      <View
        key={step}
        style={{
          width: 10, height: 10, borderRadius: 5,
          backgroundColor: done ? color : C.hairline,
          borderWidth: done ? 0 : 1.5,
          borderColor: done ? 'transparent' : '#cbd5e1',
        }}
      />
    );
    if (idx < PIPELINE.length - 1) {
      dots.push(
        <View
          key={`line-${idx}`}
          style={{
            flex: 1, height: 2,
            backgroundColor: idx < currentIdx ? color : C.hairline,
            borderRadius: 1,
          }}
        />
      );
    }
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
      {dots}
    </View>
  );
}

// ─── Order card ───────────────────────────────────────────────────────────────
function OrderCard({ item }: { item: Order }) {
  const router = useRouter();
  const updateStatus = useUpdateOrderStatus();
  const next = nextStatus(item.status);
  const nextLabel = next ? ORDER_STATUS_LABELS[next].ar : null;
  const nextColor = next ? ORDER_STATUS_LABELS[next].color : C.muted;
  const statusInfo = ORDER_STATUS_LABELS[item.status];

  return (
    <View style={{
      backgroundColor: C.card, borderRadius: 20,
      marginHorizontal: 16, marginVertical: 5,
      padding: 16,
      shadowColor: '#1e293b', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
    }}>
      {/* ── Top row: status badge + order number ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <TouchableOpacity onPress={() => router.push(`/(customer)/orders/${item.id}` as any)}>
          <Text style={{ fontSize: 15, fontWeight: '900', color: C.text }}>#{item.order_number}</Text>
        </TouchableOpacity>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 5,
          paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
          backgroundColor: statusInfo.color + '18',
        }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusInfo.color }} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: statusInfo.color }}>
            {statusInfo.ar}
          </Text>
        </View>
      </View>

      {/* ── Meta: date + items + total ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: '900', color: C.brand }}>{formatPrice(item.total_amount)}</Text>
        <View style={{ flex: 1 }} />
        <Text style={{ fontSize: 11, color: C.muted }}>{item.items?.length ?? 0} منتج</Text>
        <Text style={{ fontSize: 11, color: C.hairline, marginHorizontal: 6 }}>·</Text>
        <Text style={{ fontSize: 11, color: C.muted }}>{formatDate(item.created_at)}</Text>
      </View>

      {/* ── Pipeline stepper ── */}
      <View style={{ marginBottom: 14 }}>
        <OrderStepper status={item.status} />
      </View>

      {/* ── Action buttons ── */}
      {(next || (item.status !== 'delivered' && item.status !== 'cancelled')) && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {next && (
            <TouchableOpacity
              onPress={() => updateStatus.mutate({ id: item.id, status: next })}
              disabled={updateStatus.isPending}
              activeOpacity={0.75}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 12,
                backgroundColor: nextColor + '14',
                borderWidth: 1.5, borderColor: nextColor,
                alignItems: 'center', justifyContent: 'center',
                flexDirection: 'row', gap: 5,
              }}
            >
              {updateStatus.isPending ? (
                <ActivityIndicator size="small" color={nextColor} />
              ) : (
                <>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: nextColor }}>{nextLabel}</Text>
                  <Ionicons name="arrow-back" size={13} color={nextColor} />
                </>
              )}
            </TouchableOpacity>
          )}

          {item.status !== 'delivered' && item.status !== 'cancelled' && (
            <TouchableOpacity
              onPress={() => updateStatus.mutate({ id: item.id, status: 'cancelled' })}
              disabled={updateStatus.isPending}
              activeOpacity={0.75}
              style={{
                paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12,
                backgroundColor: '#fff1f2',
                borderWidth: 1.5, borderColor: '#ef4444',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#ef4444' }}>إلغاء</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Status filter tabs ───────────────────────────────────────────────────────
const FILTER_TABS: Array<{ key: OrderStatus | 'all'; label: string }> = [
  { key: 'all',       label: 'الكل'   },
  { key: 'pending',   label: 'معلق'   },
  { key: 'confirmed', label: 'مؤكد'   },
  { key: 'preparing', label: 'قيد التجهيز' },
  { key: 'shipped',   label: 'شُحن'   },
  { key: 'delivered', label: 'مُسلَّم' },
  { key: 'cancelled', label: 'ملغي'   },
];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AdminOrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<OrderStatus | 'all'>('all');

  const { data: allOrders, isLoading } = useAdminOrders();

  const displayOrders = useMemo(() => {
    if (!allOrders) return [];
    if (activeFilter === 'all') return allOrders;
    return allOrders.filter((o) => o.status === activeFilter);
  }, [allOrders, activeFilter]);

  // Count per status for filter tab badges
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: allOrders?.length ?? 0 };
    allOrders?.forEach((o) => { c[o.status] = (c[o.status] ?? 0) + 1; });
    return c;
  }, [allOrders]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <View style={{
        backgroundColor: C.card,
        paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: C.hairline,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard')}
            style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="home-outline" size={18} color={C.muted} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>
            {t('admin.manageOrders')}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {/* ── Status filter tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            const count = counts[tab.key] ?? 0;
            if (count === 0 && tab.key !== 'all') return null;
            const tabColor = tab.key === 'all'
              ? C.brand
              : (ORDER_STATUS_LABELS[tab.key as OrderStatus]?.color ?? C.muted);

            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveFilter(tab.key)}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                  backgroundColor: isActive ? tabColor : '#f1f5f9',
                  borderWidth: isActive ? 0 : 1,
                  borderColor: C.hairline,
                }}
              >
                <Text style={{
                  fontSize: 12, fontWeight: '700',
                  color: isActive ? '#fff' : C.muted,
                }}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={{
                    minWidth: 18, height: 18, borderRadius: 9,
                    backgroundColor: isActive ? '#ffffff30' : tabColor + '20',
                    alignItems: 'center', justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}>
                    <Text style={{
                      fontSize: 10, fontWeight: '900',
                      color: isActive ? '#fff' : tabColor,
                    }}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Order list ──────────────────────────────────────────── */}
      <FlatList
        data={displayOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OrderCard item={item} />}
        contentContainerStyle={{ paddingVertical: 10, paddingBottom: 40 }}
        ListHeaderComponent={
          isLoading ? (
            <View style={{ padding: 16, gap: 10 }}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={{
                  backgroundColor: C.card, borderRadius: 20, padding: 16, gap: 10,
                  shadowColor: '#1e293b', shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Skeleton width={80} height={20} borderRadius={6} />
                    <Skeleton width={70} height={26} borderRadius={20} />
                  </View>
                  <Skeleton width={120} height={12} borderRadius={5} />
                  <Skeleton height={10} borderRadius={5} />
                  <Skeleton height={40} borderRadius={12} />
                </View>
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={{ paddingTop: 80, alignItems: 'center', gap: 10 }}>
              <Ionicons name="receipt-outline" size={48} color="#cbd5e1" />
              <Text style={{ color: C.muted, fontSize: 15, fontWeight: '600' }}>
                لا توجد طلبات
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
