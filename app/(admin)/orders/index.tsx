import { View, Text, TouchableOpacity } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAdminOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { OrderStatusBadge } from '@/components/order/OrderStatusBadge';
import { formatPrice } from '@/utils/formatPrice';
import { formatDate } from '@/utils/formatDate';
import { Order } from '@/types/models';
import { OrderStatus } from '@/types/database.types';
import { ORDER_STATUS_LABELS } from '@/lib/constants';

// Forward-only progression steps (excluding cancelled which is a side action)
const STATUS_STEPS: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];

function nextStatus(current: OrderStatus): OrderStatus | null {
  const idx = STATUS_STEPS.indexOf(current);
  if (idx === -1 || idx === STATUS_STEPS.length - 1) return null;
  return STATUS_STEPS[idx + 1];
}

function OrderCard({ item }: { item: Order }) {
  const router = useRouter();
  const updateStatus = useUpdateOrderStatus();
  const next = nextStatus(item.status);
  const nextLabel = next ? ORDER_STATUS_LABELS[next].ar : null;
  const nextColor = next ? ORDER_STATUS_LABELS[next].color : '#6b7280';

  return (
    <View style={{
      backgroundColor: '#ffffff', borderRadius: 20,
      marginHorizontal: 16, marginVertical: 6,
      padding: 16,
      shadowColor: '#1c1917', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    }}>
      {/* Header row — RTL: status badge right, order number left */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, direction: 'rtl' as any }}>
        <OrderStatusBadge status={item.status} />
        <TouchableOpacity onPress={() => router.push(`/(customer)/orders/${item.id}`)}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#1c1917' }}>#{item.order_number}</Text>
        </TouchableOpacity>
      </View>

      {/* Date + items — RTL: price right, count left */}
      <Text style={{ fontSize: 12, color: '#857d78', marginBottom: 4, textAlign: 'right' }}>{formatDate(item.created_at)}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, direction: 'rtl' as any }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#e36523' }}>{formatPrice(item.total_amount)}</Text>
        <Text style={{ fontSize: 13, color: '#857d78' }}>{item.items?.length ?? 0} منتجات</Text>
      </View>

      {/* Status action buttons */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {/* Advance to next status */}
        {next && (
          <TouchableOpacity
            onPress={() => updateStatus.mutate({ id: item.id, status: next })}
            disabled={updateStatus.isPending}
            style={{
              flex: 1, paddingVertical: 10, borderRadius: 10,
              backgroundColor: nextColor + '18',
              borderWidth: 1.5, borderColor: nextColor,
              alignItems: 'center',
            }}
            activeOpacity={0.75}
          >
            {updateStatus.isPending ? (
              <ActivityIndicator size="small" color={nextColor} />
            ) : (
              <Text style={{ fontSize: 13, fontWeight: '700', color: nextColor }}>{nextLabel} ←</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Cancel — only if not already delivered/cancelled */}
        {item.status !== 'delivered' && item.status !== 'cancelled' && (
          <TouchableOpacity
            onPress={() => updateStatus.mutate({ id: item.id, status: 'cancelled' })}
            disabled={updateStatus.isPending}
            style={{
              paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10,
              backgroundColor: '#fef2f2',
              borderWidth: 1.5, borderColor: '#dc2626',
              alignItems: 'center',
            }}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#dc2626' }}>إلغاء</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function AdminOrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: orders, isLoading } = useAdminOrders();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f7f5' }}>
      <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e6e0d8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ width: 36 }} />
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#1c1917' }}>{t('admin.manageOrders')}</Text>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard')} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18, color: '#374151' }}>›</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OrderCard item={item} />}
        ListHeaderComponent={
          isLoading ? (
            <View style={{ padding: 16, gap: 10 }}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 10, shadowColor: '#1c1917', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Skeleton width={70} height={24} borderRadius={20} />
                    <Skeleton width={80} height={14} borderRadius={5} />
                  </View>
                  <Skeleton width={100} height={11} borderRadius={5} />
                  <Skeleton height={40} borderRadius={10} />
                </View>
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={{ paddingTop: 80, alignItems: 'center' }}>
              <Text style={{ color: '#857d78', fontSize: 15 }}>لا توجد طلبات</Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingVertical: 10, paddingBottom: 32 }}
      />
    </SafeAreaView>
  );
}


