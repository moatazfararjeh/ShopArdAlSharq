import { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useOrders } from '@/hooks/useOrders';
import { OrderCardSkeleton } from '@/components/ui/Skeleton';
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

  const scale = useRef(new Animated.Value(1)).current;
  function onPressIn() {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 300, friction: 15 }).start();
  }
  function onPressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 15 }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }], marginHorizontal: 16, marginVertical: 7 }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 20,
          padding: 16,
          shadowColor: '#1c1917',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.07,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        {/* Top row — RTL: status badge right, order number left */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, direction: 'rtl' as any }}>
          <StatusBadge status={order.status} />
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827' }}>
            #{order.order_number}
          </Text>
        </View>

        {/* Date */}
        <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12, textAlign: 'right' }}>
          🗓 {formatDate(order.created_at)}
        </Text>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: '#f3f4f6', marginBottom: 12 }} />

        {/* Footer row — RTL: price right, items count left */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', direction: 'rtl' as any }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#e36523' }}>
            {formatPrice(order.total_amount)}
          </Text>
          <View style={{ backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '600' }}>
              {itemCount} {t('orders.items', { defaultValue: 'منتجات' })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function OrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: orders, isLoading } = useOrders();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f7f5' }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, direction: 'rtl' as any }}>
        <Text style={{ fontSize: 26, fontWeight: '900', color: '#1c1917', letterSpacing: -0.3 }}>
          {t('orders.title')}
        </Text>
        {orders && orders.length > 0 && (
          <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>
            {orders.length} {t('orders.ordersCount', { defaultValue: 'طلبات' })}
          </Text>
        )}
      </View>

      {isLoading ? (
        <View style={{ paddingTop: 4 }}>
          {[1, 2, 3, 4].map((i) => <OrderCardSkeleton key={i} />)}
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
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 100 }}>
              <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 44 }}>📋</Text>
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#1c1917', marginBottom: 6 }}>
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

