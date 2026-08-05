import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useProductStatistics, useProductDailyStats, useCartUsers, useRefreshProductStatistics } from '@/hooks/useAnalytics';
import { useProduct } from '@/hooks/useProducts';
import { getProductName } from '@/types/models';
import { getCurrentLocale } from '@/i18n';
import { formatDate } from '@/utils/formatDate';

interface StatCardProps {
  icon: string;
  label: string;
  value: number | string;
  color: string;
  subtitle?: string;
}

function StatCard({ icon, label, value, color, subtitle }: StatCardProps) {
  return (
    <View className="bg-white rounded-xl p-4 flex-1 min-w-[45%] m-1 shadow-sm border border-gray-100">
      <View className="flex-row items-center mb-2">
        <View className={`w-8 h-8 rounded-full items-center justify-center`} style={{ backgroundColor: color + '20' }}>
          <Ionicons name={icon as any} size={16} color={color} />
        </View>
      </View>
      <Text className="text-2xl font-bold text-gray-900">{value}</Text>
      <Text className="text-xs text-gray-500 mt-1">{label}</Text>
      {subtitle && <Text className="text-xs text-gray-400 mt-0.5">{subtitle}</Text>}
    </View>
  );
}

export default function ProductAnalyticsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const locale = getCurrentLocale();

  const { data: product } = useProduct(id);
  const { data: stats, isLoading } = useProductStatistics(id);
  const { data: dailyStats } = useProductDailyStats(id, 30);
  const { data: cartUsers } = useCartUsers(id);
  const refreshMutation = useRefreshProductStatistics();

  const [showCartUsers, setShowCartUsers] = useState(false);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  const productName = product ? getProductName(product, locale) : '';

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 py-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(admin)/products' as any)} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="#111" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>
                إحصائيات المنتج
              </Text>
              <Text className="text-sm text-gray-500" numberOfLines={1}>{productName}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => refreshMutation.mutate(id)}
            className="bg-blue-50 p-2 rounded-lg"
          >
            <Ionicons name="refresh" size={20} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {/* Main Stats Grid */}
        <View className="flex-row flex-wrap mb-4">
          <StatCard
            icon="eye-outline"
            label="المشاهدات"
            value={stats?.views_count ?? 0}
            color="#2563eb"
            subtitle={`${stats?.unique_viewers ?? 0} مستخدم فريد`}
          />
          <StatCard
            icon="layers-outline"
            label="الظهور"
            value={stats?.impressions_count ?? 0}
            color="#7c3aed"
          />
          <StatCard
            icon="cart-outline"
            label="اضافة للسلة"
            value={stats?.add_to_cart_count ?? 0}
            color="#f59e0b"
            subtitle={`${stats?.unique_cart_users ?? 0} مستخدم`}
          />
          <StatCard
            icon="share-social-outline"
            label="مشاركة الاعلان"
            value={stats?.shares_count ?? 0}
            color="#10b981"
          />
          <StatCard
            icon="heart-outline"
            label="المفضلة"
            value={stats?.wishlist_count ?? 0}
            color="#ef4444"
          />
          <StatCard
            icon="bag-check-outline"
            label="عمليات الشراء"
            value={stats?.purchases_count ?? 0}
            color="#06b6d4"
          />
          <StatCard
            icon="person-outline"
            label="أضاف ولم يشتري"
            value={stats?.abandoned_cart_users ?? 0}
            color="#dc2626"
            subtitle="سلات متروكة"
          />
          <StatCard
            icon="trending-up-outline"
            label="نسبة التحويل"
            value={`${stats?.conversion_rate ?? 0}%`}
            color="#059669"
            subtitle="من المشاهدة للشراء"
          />
        </View>

        {/* Conversion Funnel */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-base font-bold text-gray-900 mb-3">قمع التحويل</Text>
          <FunnelBar label="الظهور" value={stats?.impressions_count ?? 0} maxValue={stats?.impressions_count ?? 1} color="#7c3aed" />
          <FunnelBar label="المشاهدات" value={stats?.views_count ?? 0} maxValue={stats?.impressions_count ?? 1} color="#2563eb" />
          <FunnelBar label="اضافة للسلة" value={stats?.add_to_cart_count ?? 0} maxValue={stats?.impressions_count ?? 1} color="#f59e0b" />
          <FunnelBar label="الشراء" value={stats?.purchases_count ?? 0} maxValue={stats?.impressions_count ?? 1} color="#10b981" />
        </View>

        {/* Cart Users Section */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <TouchableOpacity
            onPress={() => setShowCartUsers(!showCartUsers)}
            className="flex-row items-center justify-between"
          >
            <Text className="text-base font-bold text-gray-900">
              المستخدمين الذين أضافوا المنتج ({cartUsers?.length ?? 0})
            </Text>
            <Ionicons name={showCartUsers ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
          </TouchableOpacity>

          {showCartUsers && cartUsers && cartUsers.length > 0 && (
            <View className="mt-3">
              {cartUsers.map((user, index) => (
                <View key={`${user.user_id}-${index}`} className="flex-row items-center justify-between py-2 border-b border-gray-50">
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-900">
                      {user.full_name || 'بدون اسم'}
                    </Text>
                    <Text className="text-xs text-gray-500">{user.email}</Text>
                  </View>
                  <View className={`px-2 py-1 rounded-full ${user.purchased ? 'bg-green-100' : 'bg-red-100'}`}>
                    <Text className={`text-xs ${user.purchased ? 'text-green-700' : 'text-red-700'}`}>
                      {user.purchased ? 'اشترى' : 'لم يشتري'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Daily Trend */}
        {dailyStats && dailyStats.length > 0 && (
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
            <Text className="text-base font-bold text-gray-900 mb-1">آخر 30 يوم</Text>
            {/* Legend */}
            <View className="flex-row flex-wrap gap-x-3 gap-y-1 mb-3">
              <Text className="text-xs text-blue-600">👁 مشاهدة</Text>
              <Text className="text-xs text-amber-600">🛒 سلة</Text>
              <Text className="text-xs text-green-600">✅ شراء</Text>
              <Text className="text-xs text-red-500">❤️ مفضلة</Text>
              <Text className="text-xs text-emerald-600">📤 مشاركة</Text>
            </View>
            {dailyStats.slice(-7).map((day) => (
              <View key={day.date} className="flex-row items-center justify-between py-1.5 border-b border-gray-50">
                <Text className="text-xs text-gray-500 w-14">{day.date.slice(5)}</Text>
                <View className="flex-row items-center flex-wrap gap-x-3 gap-y-0.5 flex-1 justify-end">
                  <Text className="text-xs text-blue-600">👁 {day.views}</Text>
                  <Text className="text-xs text-amber-600">🛒 {day.add_to_cart}</Text>
                  <Text className="text-xs text-green-600">✅ {day.purchases}</Text>
                  {day.wishlist > 0 && <Text className="text-xs text-red-500">❤️ {day.wishlist}</Text>}
                  {day.shares > 0 && <Text className="text-xs text-emerald-600">📤 {day.shares}</Text>}
                  {day.impressions > 0 && <Text className="text-xs text-purple-600">📋 {day.impressions}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Timestamps */}
        <View className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100">
          <Text className="text-base font-bold text-gray-900 mb-2">معلومات إضافية</Text>
          {stats?.last_viewed_at && (
            <Text className="text-sm text-gray-600 mb-1">
              آخر مشاهدة: {formatDate(stats.last_viewed_at)}
            </Text>
          )}
          {stats?.last_purchased_at && (
            <Text className="text-sm text-gray-600">
              آخر شراء: {formatDate(stats.last_purchased_at)}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Funnel Bar Component ────────────────────────────────────────────────────

function FunnelBar({ label, value, maxValue, color }: { label: string; value: number; maxValue: number; color: string }) {
  const width = maxValue > 0 ? Math.max((value / maxValue) * 100, 2) : 2;
  return (
    <View className="mb-2">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-xs text-gray-600">{label}</Text>
        <Text className="text-xs font-medium text-gray-900">{value}</Text>
      </View>
      <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <View className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}
