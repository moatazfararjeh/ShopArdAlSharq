import { View, Text } from 'react-native';
import { OrderStatus } from '@/types/database.types';
import { ORDER_STATUS_LABELS } from '@/lib/constants';
import { getCurrentLocale } from '@/i18n';

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const locale = getCurrentLocale();
  const statusInfo = ORDER_STATUS_LABELS[status];

  return (
    <View
      className="items-center justify-center rounded-full px-3 py-1"
      style={{ backgroundColor: statusInfo.color + '22' }}
    >
      <Text className="text-xs font-semibold" style={{ color: statusInfo.color }}>
        {statusInfo[locale]}
      </Text>
    </View>
  );
}
