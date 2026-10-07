import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrders, getOrderById, placeOrder, updateOrderStatus } from '@/services/orderService';
import { GetOrdersParams } from '@/services/orderService';
import { CheckoutPayload } from '@/types/models';
import { OrderStatus } from '@/types/database.types';
import { sendOrderStatusNotification, sendNewOrderAdminNotification, sendNewOrderCustomerNotification } from '@/services/pushNotificationService';
import { sendOrderReceivedWhatsApp, sendNewOrderAdminWhatsApp, sendOrderStatusWhatsApp } from '@/services/whatsappService';
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

export function usePlaceOrder() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user?.id);
  return useMutation({
    mutationFn: (payload: CheckoutPayload) => placeOrder(payload),
    onSuccess: async (result) => {
      qc.invalidateQueries({ queryKey: orderKeys.lists() });

      // Fetch customer profile for phone number
      const { data: customerProfile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', userId!)
        .single()
        .catch(() => ({ data: null }));

      // Fetch all admin profiles for phone numbers
      const { data: adminProfiles } = await (supabase as any)
        .from('profiles')
        .select('id, phone')
        .in('role', ['admin', 'super_admin'])
        .catch(() => ({ data: [] }));

      // Push notifications (in-app + push)
      if (userId) {
        void sendNewOrderCustomerNotification(result.order_id, result.order_number, result.total_amount, userId).catch(() => {});
      }
      void sendNewOrderAdminNotification(result.order_id, result.order_number, result.total_amount).catch(() => {});

      // WhatsApp messages
      const customerPhone = (customerProfile as any)?.phone;
      if (customerPhone) {
        void sendOrderReceivedWhatsApp(customerPhone, result.order_number, result.total_amount).catch(() => {});
      }
      if (adminProfiles?.length) {
        for (const admin of adminProfiles as Array<{ id: string; phone: string | null }>) {
          if (admin.phone) {
            void sendNewOrderAdminWhatsApp(admin.phone, result.order_number, result.total_amount, result.order_id).catch(() => {});
          }
        }
      }
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
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', order.user_id)
        .single()
        .catch(() => ({ data: null }));
      const phone = (profile as any)?.phone;
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
