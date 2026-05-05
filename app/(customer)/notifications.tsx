import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { Notification } from '@/types/models';
import { useNotifications, useMarkRead, useMarkAllRead } from '@/hooks/useNotifications';
import { formatDateTime } from '@/utils/formatDate';

const TYPE_META: Record<string, { icon: string; color: string }> = {
  order_placed:    { icon: '🛍️', color: '#3b82f6' },
  order_confirmed: { icon: '✅', color: '#2563eb' },
  order_preparing: { icon: '👨‍🍳', color: '#ca8a04' },
  order_shipped:   { icon: '🚚', color: '#7c3aed' },
  order_delivered: { icon: '📦', color: '#16a34a' },
  order_cancelled: { icon: '❌', color: '#dc2626' },
  promo:           { icon: '🎁', color: '#e36523' },
  system:          { icon: '🔔', color: '#6b7280' },
};

function NotificationRow({ item }: { item: Notification }) {
  const markRead = useMarkRead();
  const router = useRouter();
  const meta = TYPE_META[item.type] ?? TYPE_META.system;

  function handlePress() {
    if (!item.is_read) markRead.mutate(item.id);
    const data = (item as any).data;
    if (data?.orderId) {
      router.push(`/(customer)/orders/${data.orderId}` as any);
    }
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: item.is_read ? '#fafaf9' : '#fff8f5',
        borderBottomWidth: 1,
        borderBottomColor: '#f0ece8',
        gap: 12,
      }}
    >
      {/* Icon */}
      <View style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: item.is_read ? '#f3f4f6' : '#fff0eb',
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Text style={{ fontSize: 20 }}>{meta.icon}</Text>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 14,
          fontWeight: item.is_read ? '500' : '700',
          color: '#111827',
          lineHeight: 20,
        }}>
          {item.title_ar}
        </Text>
        {item.body_ar ? (
          <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 3, lineHeight: 18 }} numberOfLines={2}>
            {item.body_ar}
          </Text>
        ) : null}
        <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 5 }}>
          {formatDateTime(item.created_at)}
        </Text>
      </View>

      {/* Unread dot */}
      {!item.is_read && (
        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#e36523', marginTop: 4, flexShrink: 0 }} />
      )}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { data: notifications = [], isLoading, refetch } = useNotifications();
  const markAll = useMarkAllRead();
  const router = useRouter();
  const hasUnread = notifications.some((n) => !n.is_read);

  // Refetch every time the tab gets focused (handles stale cache from tab switching)
  useFocusEffect(
    useCallback(() => { refetch(); }, [refetch]),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f7f5' }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#ede8e1',
        gap: 10,
      }}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(customer)/home' as any)}
          style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 18, color: '#374151' }}>›</Text>
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: '#1c1917' }}>التنبيهات</Text>
        {hasUnread && (
          <TouchableOpacity
            onPress={() => markAll.mutate()}
            style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff0eb', borderRadius: 10 }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#e36523' }}>قراءة الكل</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#e36523" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Text style={{ fontSize: 52 }}>🔔</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1c1917' }}>لا توجد تنبيهات</Text>
          <Text style={{ fontSize: 13, color: '#857d78' }}>ستظهر هنا تحديثات طلباتك والعروض</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotificationRow item={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
}
