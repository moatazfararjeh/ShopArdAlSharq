import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOrder } from '@/hooks/useOrders';
import { formatPrice } from '@/utils/formatPrice';
import { formatDateTime } from '@/utils/formatDate';
import { getCurrentLocale } from '@/i18n';
import { getProductName } from '@/types/models';

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending:    { bg: '#fff7ed', text: '#ea580c', label: '⏳' },
  confirmed:  { bg: '#eff6ff', text: '#2563eb', label: '✅' },
  preparing:  { bg: '#fefce8', text: '#ca8a04', label: '👨‍🍳' },
  ready:      { bg: '#f0fdf4', text: '#16a34a', label: '🎉' },
  delivered:  { bg: '#f0fdf4', text: '#15803d', label: '📦' },
  cancelled:  { bg: '#fef2f2', text: '#dc2626', label: '❌' },
};

// Ordered flow — cancelled is handled separately
const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'] as const;

const STATUS_META: Record<string, { icon: string; labelAr: string }> = {
  pending:   { icon: '⏳', labelAr: 'قيد الانتظار' },
  confirmed: { icon: '✅', labelAr: 'تم التأكيد' },
  preparing: { icon: '👨‍🍳', labelAr: 'جارٍ التحضير' },
  ready:     { icon: '🎉', labelAr: 'جاهز للاستلام' },
  delivered: { icon: '📦', labelAr: 'تم التسليم' },
  cancelled: { icon: '❌', labelAr: 'ملغى' },
};

function OrderTimeline({ status }: { status: string }) {
  if (status === 'cancelled') {
    return (
      <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 12 }}>سير الطلب</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 18 }}>❌</Text>
          </View>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#dc2626' }}>تم إلغاء الطلب</Text>
        </View>
      </View>
    );
  }

  const currentIndex = STATUS_FLOW.indexOf(status as typeof STATUS_FLOW[number]);

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
      <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 14 }}>سير الطلب</Text>
      {STATUS_FLOW.map((step, index) => {
        const isDone    = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture  = index > currentIndex;
        const isLast    = index === STATUS_FLOW.length - 1;
        const meta      = STATUS_META[step];

        const dotColor  = isDone ? '#e36523' : isCurrent ? '#e36523' : '#e5e7eb';
        const lineColor = index < currentIndex ? '#e36523' : '#e5e7eb';

        return (
          <View key={step} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            {/* Dot + vertical line */}
            <View style={{ alignItems: 'center', width: 38 }}>
              <View style={{
                width: isCurrent ? 38 : 32,
                height: isCurrent ? 38 : 32,
                borderRadius: isCurrent ? 19 : 16,
                backgroundColor: isCurrent ? '#fff0eb' : isDone ? '#fff0eb' : '#f3f4f6',
                borderWidth: isCurrent ? 2.5 : isDone ? 2 : 1.5,
                borderColor: dotColor,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {isDone
                  ? <Text style={{ fontSize: 14 }}>✓</Text>
                  : <Text style={{ fontSize: isCurrent ? 18 : 14, opacity: isFuture ? 0.4 : 1 }}>{meta.icon}</Text>
                }
              </View>
              {!isLast && (
                <View style={{ width: 2.5, flex: 1, minHeight: 22, backgroundColor: lineColor, marginVertical: 3, borderRadius: 2 }} />
              )}
            </View>

            {/* Label */}
            <View style={{ flex: 1, paddingLeft: 12, paddingBottom: isLast ? 0 : 18, justifyContent: 'center', paddingTop: isCurrent ? 6 : 4 }}>
              <Text style={{
                fontSize: isCurrent ? 14 : 13,
                fontWeight: isCurrent ? '800' : isDone ? '600' : '500',
                color: isCurrent ? '#e36523' : isDone ? '#111827' : '#9ca3af',
              }}>
                {meta.labelAr}
              </Text>
              {isCurrent && (
                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>الحالة الحالية</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(customer)/orders/index' as any);
  }
  const locale = getCurrentLocale();
  const insets = useSafeAreaInsets();
  const { data: order, isLoading } = useOrder(id ?? '');

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>😕</Text>
        <Text style={{ fontSize: 16, color: '#6b7280' }}>{t('errors.notFound')}</Text>
        <TouchableOpacity onPress={() => goBack()} style={{ marginTop: 20, backgroundColor: '#f97316', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{t('common.back', { defaultValue: 'رجوع' })}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusConfig = STATUS_COLORS[order.status] ?? { bg: '#f3f4f6', text: '#6b7280', label: '•' };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#ffffff',
        paddingTop: insets.top + 8,
        paddingBottom: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
      }}>
        <TouchableOpacity
          onPress={() => goBack()}
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
        >
          <Text style={{ fontSize: 18 }}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>
            {t('orders.orderNumber')} #{order.order_number}
          </Text>
          <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>
            🗓 {formatDateTime(order.created_at)}
          </Text>
        </View>
        <View style={{ backgroundColor: statusConfig.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 12 }}>{statusConfig.label}</Text>
          <Text style={{ color: statusConfig.text, fontSize: 12, fontWeight: '700' }}>
            {t(`orders.status.${order.status}`, { defaultValue: order.status })}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* Timeline */}
        <OrderTimeline status={order.status} />

        {/* Items section */}
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 12, marginTop: 4 }}>
          {t('orders.orderItems')}
        </Text>

        {order.items?.map((item) => (
          <View
            key={item.id}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 18,
              padding: 14,
              marginBottom: 10,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 5,
              elevation: 2,
            }}
          >
            <Image
              source={{ uri: (item.product?.images?.[0] ?? item.product?.product_images?.[0])?.url }}
              style={{ width: 68, height: 68, borderRadius: 14 }}
              contentFit="cover"
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', lineHeight: 20 }} numberOfLines={2}>
                {item.product
                  ? getProductName(item.product, locale)
                  : (locale === 'ar' ? item.product_name_ar : (item.product_name_en ?? item.product_name_ar)) || '—'}
              </Text>
              <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                {item.quantity} × {formatPrice(item.unit_price)}
              </Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#f97316' }}>
              {formatPrice(item.total_price)}
            </Text>
          </View>
        ))}

        {/* Total card */}
        <View style={{
          backgroundColor: '#ffffff',
          borderRadius: 20,
          padding: 16,
          marginTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.07,
          shadowRadius: 8,
          elevation: 3,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 15, color: '#6b7280', fontWeight: '600' }}>{t('cart.total')}</Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#f97316' }}>
              {formatPrice(order.total_amount)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

