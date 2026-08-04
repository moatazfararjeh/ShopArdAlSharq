import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrders, getOrderById, placeOrder, updateOrderStatus } from '@/services/orderService';
import { GetOrdersParams } from '@/services/orderService';
import { CheckoutPayload } from '@/types/models';
import { OrderStatus } from '@/types/database.types';
import { sendOrderStatusNotification } from '@/services/pushNotificationService';
import { useAuthStore } from '@/stores/authStore';

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params: GetOrdersParams) => [...orderKeys.lists(), params] as const,
  detail: (id: string) => [...orderKeys.all, id] as const,
};

export function useOrders(params: GetOrdersParams = {}) {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const effectiveUserId = params.userId || userId;
  return useQuery({
    queryKey: orderKeys.list({ ...params, userId: effectiveUserId }),
    queryFn: () => getOrders({ ...params, userId: effectiveUserId }),
    enabled: !!effectiveUserId,
  });
}

export function useAdminOrders(params: Omit<GetOrdersParams, 'userId'> = {}) {
  const { isAdmin } = useAuthStore();
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => getOrders(params),
    enabled: isAdmin,
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
  const userId = useAuthStore((s) => s.session?.user?.id);
  return useMutation({
    mutationFn: (payload: CheckoutPayload) => placeOrder(payload),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: orderKeys.lists() });
      // Notify the customer — order received confirmation
      if (userId) {
        void sendNewOrderCustomerNotification(
          result.order_id,
          result.order_number,
          result.total_amount,
          userId,
        ).catch(() => {});
      }
      // Notify all admins — new order requires action
      void sendNewOrderAdminNotification(
        result.order_id,
        result.order_number,
        result.total_amount,
      ).catch(() => {});
    },
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
