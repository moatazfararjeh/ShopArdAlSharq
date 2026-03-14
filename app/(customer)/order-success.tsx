import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function OrderSuccessScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orderId, orderNumber } = useLocalSearchParams<{ orderId: string; orderNumber: string }>();
  const displayNumber = orderNumber ?? orderId?.slice(0, 8).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb', paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Top decoration */}
      <View style={{ height: 240, backgroundColor: '#fff7ed', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center', shadowColor: '#f97316', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 10 }}>
          <Text style={{ fontSize: 52 }}>🎉</Text>
        </View>
      </View>

      {/* Content */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#111827', textAlign: 'center', marginBottom: 10 }}>
          {t('checkout.orderPlaced')}
        </Text>
        <Text style={{ fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
          {t('checkout.orderPlacedDesc')}
        </Text>

        {displayNumber && (
          <View style={{ backgroundColor: '#ffffff', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12, marginBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 }}>
            <Text style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>{t('orders.orderNumber')}</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#f97316', textAlign: 'center', marginTop: 2 }}>
              #{displayNumber}
            </Text>
          </View>
        )}

        {/* CTA buttons */}
        <TouchableOpacity
          onPress={() => router.push('/(customer)/orders/')}
          activeOpacity={0.85}
          style={{ width: '100%', backgroundColor: '#f97316', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 12, shadowColor: '#f97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 }}
        >
          <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '800' }}>{t('orders.title')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace('/(customer)/home' as any)}
          activeOpacity={0.8}
          style={{ width: '100%', backgroundColor: 'transparent', borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 2, borderColor: '#f97316' }}
        >
          <Text style={{ color: '#f97316', fontSize: 15, fontWeight: '700' }}>{t('cart.continueShopping')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


