import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAdminOrders } from '@/hooks/useOrders';
import { formatPrice } from '@/utils/formatPrice';

const ORDER_STATUS_PENDING: import('@/types/database.types').OrderStatus = 'pending';
const ORDER_STATUS_DELIVERED: import('@/types/database.types').OrderStatus = 'delivered';

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
}

function StatCard({ label, value, color = '#e36523' }: StatCardProps) {
  return (
    <View style={{
      flex: 1, borderRadius: 20, backgroundColor: '#fff', padding: 16,
      borderTopColor: color, borderTopWidth: 3,
      shadowColor: '#1c1917', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    }}>
      <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, textAlign: 'right' }}>{label}</Text>
      <Text style={{ fontSize: 22, fontWeight: '900', color: '#1c1917', textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

export default function AdminDashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: allOrders } = useAdminOrders();
  const { data: pendingOrders } = useAdminOrders({ status: ORDER_STATUS_PENDING });

  const totalRevenue =
    allOrders?.filter((o) => o.status === ORDER_STATUS_DELIVERED).reduce((sum, o) => sum + o.total_amount, 0) ?? 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f7f5' }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', direction: 'rtl' as any }}>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#1c1917', letterSpacing: -0.3 }}>{t('admin.dashboard')}</Text>
          <TouchableOpacity
            onPress={() => router.push('/(customer)/home' as any)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff0eb', borderRadius: 12 }}
          >
            <Ionicons name="storefront-outline" size={16} color="#e36523" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#e36523' }}>التطبيق</Text>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StatCard label={t('admin.totalOrders')} value={allOrders?.length ?? 0} />
          <StatCard label={t('admin.pendingOrders')} value={pendingOrders?.length ?? 0} color="#f59e0b" />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StatCard label={t('admin.totalRevenue')} value={formatPrice(totalRevenue)} color="#10b981" />
        </View>

        {/* Quick nav */}
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#9ca3af', textAlign: 'right', marginTop: 4, letterSpacing: 0.5 }}>إدارة سريعة</Text>
        {[
          { label: t('admin.manageProducts'), route: '/(admin)/products/' as const, icon: 'cube-outline' },
          { label: t('admin.manageCategories'), route: '/(admin)/categories/' as const, icon: 'grid-outline' },
          { label: 'إدارة الماركات', route: '/(admin)/brands/' as const, icon: 'ribbon-outline' },
          { label: t('admin.manageOrders'), route: '/(admin)/orders/' as const, icon: 'receipt-outline' },
          { label: 'البانرات الإعلانية', route: '/(admin)/banners/' as const, icon: 'images-outline' },
          { label: 'إدارة الحسابات', route: '/(admin)/users/' as const, icon: 'people-outline' },
        ].map((item) => (
          <TouchableOpacity
            key={item.route}
            onPress={() => router.push(item.route)}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: '#fff', borderRadius: 18, padding: 16,
              shadowColor: '#1c1917', shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
              direction: 'rtl' as any,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={item.icon as any} size={18} color="#e36523" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#1c1917' }}>{item.label}</Text>
            </View>
            <Ionicons name="chevron-back" size={18} color="#d1c9bf" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}


