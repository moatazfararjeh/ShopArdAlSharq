import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrders, getOrderById, placeOrder, updateOrderStatus } from '@/services/orderService';
import { GetOrdersParams } from '@/services/orderService';
import { CheckoutPayload } from '@/types/models';
import { OrderStatus } from '@/types/database.types';
import { sendOrderStatusNotification } from '@/services/pushNotificationService';

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params: GetOrdersParams) => [...orderKeys.lists(), params] as const,
  detail: (id: string) => [...orderKeys.all, id] as const,
};

export function useOrders(params: GetOrdersParams = {}) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => getOrders(params),
    enabled: !!params.userId,
  });
}

export function useAdminOrders(params: Omit<GetOrdersParams, 'userId'> = {}) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => getOrders(params),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => getOrderById(id),
    enabled: !!id,
  });
}

export function usePlaceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CheckoutPayload) => placeOrder(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.lists() }),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: OrderStatus; note?: string }) => {
      const order = await updateOrderStatus(id, status, note);
      // Explicitly detached — never blocks the mutation from resolving
      void sendOrderStatusNotification(order.id, order.order_number, order.user_id, status).catch(() => {});
      return order;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: orderKeys.lists() });
      qc.invalidateQueries({ queryKey: orderKeys.detail(variables.id) });
    },
  });
}
