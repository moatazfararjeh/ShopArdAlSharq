import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrders, getOrderById, placeOrder, updateOrderStatus, adminUpdateOrderItems, AdminOrderItemInput } from '@/services/orderService';
import { GetOrdersParams } from '@/services/orderService';
import { CheckoutPayload } from '@/types/models';
import { OrderStatus } from '@/types/database.types';
import { sendOrderStatusNotification } from '@/services/pushNotificationService';
import { sendOrderStatusWhatsApp } from '@/services/whatsappService';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

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

export function useAdminUpdateOrderItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, items, note }: { orderId: string; items: AdminOrderItemInput[]; note: string | null }) =>
      adminUpdateOrderItems(orderId, items, note),
    onSuccess: (_result, { orderId }) => {
      qc.invalidateQueries({ queryKey: orderKeys.lists() });
      qc.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
    },
  });
}

export function usePlaceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CheckoutPayload) => placeOrder(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: OrderStatus; note?: string }) => {
      const order = await updateOrderStatus(id, status, note);
      // Push notification to customer
      void sendOrderStatusNotification(order.id, order.order_number, order.user_id, status).catch(() => {});
      // WhatsApp to customer
      // Supabase's query builder is only "thenable" (implements .then, not a
      // real Promise), so chaining .catch() directly on it isn't safe — it
      // can throw "catch is not a function" at runtime. await inside a plain
      // try/catch works with any thenable, so it doesn't have this problem.
      let profile: { phone: string | null } | null = null;
      try {
        const result = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', order.user_id)
          .single();
        profile = result.data as { phone: string | null } | null;
      } catch {
        profile = null;
      }
      const phone = profile?.phone;
      if (phone) {
        void sendOrderStatusWhatsApp(phone, String(order.order_number), status).catch(() => {});
      }
      return order;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: orderKeys.lists() });
      qc.invalidateQueries({ queryKey: orderKeys.detail(variables.id) });
    },
  });
}
