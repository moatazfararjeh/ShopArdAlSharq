import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserDetail } from '@/hooks/useUsers';
import { useAdminOrders } from '@/hooks/useOrders';
import { useAuthStore } from '@/stores/authStore';
import { getSignedDocumentUrl } from '@/services/storageService';
import { OrderStatusBadge } from '@/components/order/OrderStatusBadge';
import { formatPrice } from '@/utils/formatPrice';
import { formatDate } from '@/utils/formatDate';
import { Order } from '@/types/models';
import { ORDER_STATUS_LABELS } from '@/lib/constants';

const C = { surface: '#f0f4f8', card: '#ffffff', brand: '#e36523', text: '#1e293b', muted: '#64748b', hairline: '#e2e8f0' };

function StatBox({ label, value, color = C.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.hairline }}>
      <Text style={{ fontSize: 18, fontWeight: '900', color }}>{value}</Text>
      <Text style={{ fontSize: 11, color: C.muted, marginTop: 3, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.hairline }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={16} color={C.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '500', textAlign: 'right' }}>{label}</Text>
        <Text style={{ fontSize: 14, color: C.text, fontWeight: '600', marginTop: 2, textAlign: 'right' }}>{value}</Text>
      </View>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={{ fontSize: 13, fontWeight: '800', color: C.muted, marginTop: 24, marginBottom: 10, textAlign: 'right', letterSpacing: 0.5 }}>
      {title}
    </Text>
  );
}

function OrderRow({ order, onPress }: { order: Order; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: C.card, borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: C.hairline, marginBottom: 8,
      }}
      activeOpacity={0.75}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <OrderStatusBadge status={order.status} />
        <Text style={{ fontSize: 14, fontWeight: '800', color: C.text }}>#{order.order_number}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.brand }}>{formatPrice(order.total_amount)}</Text>
        <Text style={{ fontSize: 12, color: C.muted }}>{formatDate(order.created_at)}</Text>
      </View>
      {order.items && order.items.length > 0 && (
        <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, textAlign: 'right' }}>
          {order.items.length} منتج
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function AdminUserDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: user, isLoading: userLoading, isError: userError } = useUserDetail(id);
  const { data: allOrders, isLoading: ordersLoading } = useAdminOrders();
  const { isInitialized } = useAuthStore();

  const userOrders = (allOrders ?? []).filter((o) => o.user_id === id);

  const deliveredOrders  = userOrders.filter((o) => o.status === 'delivered');
  const pendingOrders    = userOrders.filter((o) => ['pending', 'confirmed', 'preparing', 'shipped'].includes(o.status));
  const totalSpent       = deliveredOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const avgOrderValue    = deliveredOrders.length ? totalSpent / deliveredOrders.length : 0;

  const statusCounts = userOrders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  if (!isInitialized || userLoading) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface }}>
        <ActivityIndicator size="large" color={C.brand} />
      </SafeAreaView>
    );
  }

  if (userError || !user) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface }}>
        <Ionicons name="person-remove-outline" size={48} color="#cbd5e1" />
        <Text style={{ color: '#ef4444', marginTop: 12, fontSize: 15 }}>لم يتم العثور على الحساب</Text>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/users/' as any)} style={{ marginTop: 16 }}>
          <Text style={{ color: C.brand, fontWeight: '700' }}>العودة</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }}>
      <Stack.Screen options={{ title: user.full_name || user.email || 'تفاصيل الحساب' }} />

      {/* ── Header ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: C.card, paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: C.hairline,
      }}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(admin)/users/' as any)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="arrow-forward" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: C.text, textAlign: 'right' }} numberOfLines={1}>
            {user.full_name || 'بدون اسم'}
          </Text>
          <Text style={{ fontSize: 12, color: C.muted, textAlign: 'right' }} numberOfLines={1}>{user.email}</Text>
        </View>
        <View style={{
          paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
          backgroundColor: user.role === 'admin' ? '#fff7ed' : '#f1f5f9',
        }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: user.role === 'admin' ? C.brand : C.muted }}>
            {user.role === 'admin' ? 'مسؤول' : 'عميل'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Stats overview */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 4 }}>
          <StatBox label="إجمالي الطلبات"    value={String(userOrders.length)} />
          <StatBox label="الطلبات المكتملة"  value={String(deliveredOrders.length)} color="#10b981" />
          <StatBox label="قيد التنفيذ"       value={String(pendingOrders.length)} color="#f59e0b" />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <StatBox label="إجمالي المشتريات" value={formatPrice(totalSpent)} color={C.brand} />
          <StatBox label="متوسط الطلب"      value={formatPrice(avgOrderValue)} />
        </View>

        {/* Status distribution */}
        {userOrders.length > 0 && (
          <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 14, marginTop: 10, borderWidth: 1, borderColor: C.hairline }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 10, textAlign: 'right' }}>توزيع الحالات</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(statusCounts).map(([status, count]) => {
                const cfg = ORDER_STATUS_LABELS[status as any];
                return (
                  <View key={status} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cfg?.color ?? C.muted }} />
                    <Text style={{ fontSize: 12, color: C.text }}>{cfg?.ar ?? status}: {count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Profile info */}
        <SectionHeader title="بيانات الحساب" />
        <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.hairline }}>
          <InfoRow icon="person-outline"   label="الاسم الكامل"      value={user.full_name} />
          <InfoRow icon="mail-outline"     label="البريد الإلكتروني" value={user.email} />
          <InfoRow icon="call-outline"     label="الجوال"            value={user.phone} />
          <InfoRow icon="calendar-outline" label="تاريخ التسجيل"     value={formatDate(user.created_at)} />
          <InfoRow icon="time-outline"     label="آخر طلب"           value={user.last_order_at ? formatDate(user.last_order_at) : null} />
        </View>

        {/* Commercial register */}
        <SectionHeader title="السجل التجاري" />
        {user.commercial_register_url ? (
          <TouchableOpacity
            onPress={async () => {
              if (user.commercial_register_url) {
                try {
                  const signedUrl = await getSignedDocumentUrl(user.commercial_register_url);
                  Linking.openURL(signedUrl).catch(() => Alert.alert('خطأ', 'تعذر فتح الملف'));
                } catch {
                  Alert.alert('خطأ', 'تعذر إنشاء رابط المستند');
                }
              }
            }}
            style={{
              backgroundColor: C.card, borderRadius: 14, padding: 14,
              borderWidth: 1, borderColor: '#10b981',
              flexDirection: 'row', alignItems: 'center', gap: 10,
            }}
          >
            <Ionicons name="document-text" size={24} color="#10b981" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, textAlign: 'right' }}>عرض السجل التجاري</Text>
              <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, textAlign: 'right' }}>اضغط لفتح المستند</Text>
            </View>
            <Ionicons name="open-outline" size={18} color="#94a3b8" />
          </TouchableOpacity>
        ) : (
          <View style={{
            backgroundColor: '#f8fafc', borderRadius: 14, padding: 14,
            borderWidth: 1, borderStyle: 'dashed', borderColor: '#cbd5e1',
            flexDirection: 'row', alignItems: 'center', gap: 8,
          }}>
            <Ionicons name="document-outline" size={20} color="#94a3b8" />
            <Text style={{ fontSize: 13, color: '#94a3b8', flex: 1, textAlign: 'right' }}>لم يتم رفع سجل تجاري</Text>
          </View>
        )}

        {/* Order history */}
        <SectionHeader title={`سجل الطلبات (${userOrders.length})`} />
        {ordersLoading ? (
          <ActivityIndicator color={C.brand} style={{ marginTop: 20 }} />
        ) : userOrders.length === 0 ? (
          <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: C.hairline }}>
            <Ionicons name="bag-outline" size={32} color="#cbd5e1" />
            <Text style={{ color: '#94a3b8', marginTop: 8 }}>لا توجد طلبات</Text>
          </View>
        ) : (
          userOrders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              onPress={() => router.push(`/(customer)/orders/${order.id}` as any)}
            />
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
