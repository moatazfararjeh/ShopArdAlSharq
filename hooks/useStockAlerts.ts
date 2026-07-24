import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  subscribeStockAlert,
  unsubscribeStockAlert,
  getStockAlertStatus,
  getStockAlertSubscriberCount,
} from '@/services/stockAlertService';
import { useAuthStore } from '@/stores/authStore';

// ─── Customer: is this product in my stock alerts? ───────────────────────────

export function useStockAlertStatus(productId: string | undefined) {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: ['stock-alert', productId, session?.user?.id],
    queryFn: () => getStockAlertStatus(productId!, session!.user.id),
    enabled: !!productId && !!session?.user?.id,
  });
}

// ─── Customer: subscribe / unsubscribe ───────────────────────────────────────

export function useToggleStockAlert(productId: string) {
  const session = useAuthStore((s) => s.session);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subscribe: boolean) =>
      subscribe
        ? subscribeStockAlert(productId, session!.user.id)
        : unsubscribeStockAlert(productId, session!.user.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-alert', productId] });
    },
  });
}

// ─── Admin: how many users are waiting? ──────────────────────────────────────

export function useStockAlertSubscriberCount(productId: string | undefined) {
  return useQuery({
    queryKey: ['stock-alert-count', productId],
    queryFn: () => getStockAlertSubscriberCount(productId!),
    enabled: !!productId,
  });
}
