import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
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
      backgroundColor: '#ffffff', borderRadius: 16,
      marginHorizontal: 16, marginVertical: 6,
      padding: 16,
      borderWidth: 1, borderColor: '#e6e0d8',
    }}>
      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <TouchableOpacity onPress={() => router.push(`/(customer)/orders/${item.id}`)}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#1c1917' }}>#{item.order_number}</Text>
        </TouchableOpacity>
        <OrderStatusBadge status={item.status} />
      </View>

      {/* Date + items */}
      <Text style={{ fontSize: 12, color: '#857d78', marginBottom: 4 }}>{formatDate(item.created_at)}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ fontSize: 13, color: '#857d78' }}>{item.items?.length ?? 0} منتجات</Text>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#e36523' }}>{formatPrice(item.total_amount)}</Text>
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
  const { data: orders, isLoading } = useAdminOrders();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f7f5' }}>
      <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e6e0d8' }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#1c1917' }}>{t('admin.manageOrders')}</Text>
      </View>

      <FlatList
        data={orders ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OrderCard item={item} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ paddingTop: 80, alignItems: 'center' }}>
              <ActivityIndicator color="#e36523" />
            </View>
          ) : (
            <View style={{ paddingTop: 80, alignItems: 'center' }}>
              <Text style={{ color: '#857d78', fontSize: 15 }}>لا توجد طلبات</Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingVertical: 10, paddingBottom: 32 }}
      />
    </SafeAreaView>
  );
}


