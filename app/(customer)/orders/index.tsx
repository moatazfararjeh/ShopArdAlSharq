import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useOrders } from '@/hooks/useOrders';
import { useAuthStore } from '@/stores/authStore';
import { formatPrice } from '@/utils/formatPrice';
import { formatDate } from '@/utils/formatDate';
import { Order } from '@/types/models';

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending:    { bg: '#fff7ed', text: '#ea580c', label: '⏳' },
  confirmed:  { bg: '#eff6ff', text: '#2563eb', label: '✅' },
  preparing:  { bg: '#fefce8', text: '#ca8a04', label: '👨‍🍳' },
  shipped:    { bg: '#f5f3ff', text: '#7c3aed', label: '🚚' },
  delivered:  { bg: '#f0fdf4', text: '#15803d', label: '📦' },
  cancelled:  { bg: '#fef2f2', text: '#dc2626', label: '❌' },
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const config = STATUS_COLORS[status] ?? { bg: '#f3f4f6', text: '#6b7280', label: '•' };
  return (
    <View style={{ backgroundColor: config.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Text style={{ fontSize: 11 }}>{config.label}</Text>
      <Text style={{ color: config.text, fontSize: 12, fontWeight: '700' }}>
        {t(`orders.status.${status}`, { defaultValue: status })}
      </Text>
    </View>
  );
}

function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const { t } = useTranslation();
  const itemCount = order.items?.length ?? 0;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        marginHorizontal: 16,
        marginVertical: 7,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      {/* Top row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827' }}>
          #{order.order_number}
        </Text>
        <StatusBadge status={order.status} />
      </View>

      {/* Date */}
      <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
        🗓 {formatDate(order.created_at)}
      </Text>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: '#f3f4f6', marginBottom: 12 }} />

      {/* Footer row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '600' }}>
            {itemCount} {t('orders.items', { defaultValue: 'منتجات' })}
          </Text>
        </View>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#f97316' }}>
          {formatPrice(order.total_amount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function OrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useAuthStore();
  const { data: orders, isLoading } = useOrders({ userId: session?.user.id });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#111827' }}>
          {t('orders.title')}
        </Text>
        {orders && orders.length > 0 && (
          <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>
            {orders.length} {t('orders.ordersCount', { defaultValue: 'طلبات' })}
          </Text>
        )}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : (
        <FlatList
          data={orders ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => router.push(`/(customer)/orders/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 }}>
              <Text style={{ fontSize: 64, marginBottom: 16 }}>📋</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 6 }}>
                {t('orders.noOrders')}
              </Text>
              <Text style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center' }}>
                {t('orders.noOrdersDesc', { defaultValue: 'لم تقم بأي طلبات بعد' })}
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

