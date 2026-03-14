import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAdminOrders } from '@/hooks/useOrders';
import { formatPrice } from '@/utils/formatPrice';

const ORDER_STATUS_PENDING: import('@/types/database.types').OrderStatus = 'pending';
const ORDER_STATUS_DELIVERED: import('@/types/database.types').OrderStatus = 'delivered';

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
}

function StatCard({ label, value, color = '#f97316' }: StatCardProps) {
  return (
    <View className="flex-1 rounded-2xl bg-white p-4 shadow-sm" style={{ borderTopColor: color, borderTopWidth: 3 }}>
      <Text className="mb-1 text-xs text-gray-500">{label}</Text>
      <Text className="text-xl font-bold text-gray-900">{value}</Text>
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
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerClassName="p-4 gap-4">
        <Text className="text-2xl font-bold text-gray-900">{t('admin.dashboard')}</Text>

        {/* Stats row */}
        <View className="flex-row gap-3">
          <StatCard label={t('admin.totalOrders')} value={allOrders?.length ?? 0} />
          <StatCard label={t('admin.pendingOrders')} value={pendingOrders?.length ?? 0} color="#f59e0b" />
        </View>
        <View className="flex-row gap-3">
          <StatCard label={t('admin.totalRevenue')} value={formatPrice(totalRevenue)} color="#10b981" />
        </View>

        {/* Quick nav */}
        <Text className="mt-2 font-semibold text-gray-700">إدارة سريعة</Text>
        {[
          { label: t('admin.manageProducts'), route: '/(admin)/products/' as const },
          { label: t('admin.manageCategories'), route: '/(admin)/categories/' as const },
          { label: t('admin.manageOrders'), route: '/(admin)/orders/' as const },
          { label: 'البانرات الإعلانية', route: '/(admin)/banners/' as const },
        ].map((item) => (
          <TouchableOpacity
            key={item.route}
            onPress={() => router.push(item.route)}
            className="flex-row items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
          >
            <Text className="font-medium text-gray-800">{item.label}</Text>
            <Text className="text-gray-400">←</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

