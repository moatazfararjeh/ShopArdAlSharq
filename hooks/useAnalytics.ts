import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProductStatistics,
  getAllProductStatistics,
  getProductEvents,
  getProductDailyStats,
  recordProductEvent,
  refreshProductStatistics,
  getCartUsers,
  getGlobalAnalyticsSummary,
  getTopProducts,
  getGlobalDailyStats,
  ProductEventType,
  TopProductMetric,
} from '@/services/analyticsService';

// ─── Keys ────────────────────────────────────────────────────────────────────

const keys = {
  all: ['analytics'] as const,
  product: (id: string) => [...keys.all, 'product', id] as const,
  productEvents: (id: string) => [...keys.all, 'events', id] as const,
  productDaily: (id: string, days: number) => [...keys.all, 'daily', id, days] as const,
  allStats: (sortBy?: string) => [...keys.all, 'all-stats', sortBy] as const,
  cartUsers: (id: string) => [...keys.all, 'cart-users', id] as const,
};

// ─── Get Product Statistics ──────────────────────────────────────────────────

export function useProductStatistics(productId: string | undefined) {
  return useQuery({
    queryKey: keys.product(productId!),
    queryFn: () => getProductStatistics(productId!),
    enabled: !!productId,
  });
}

// ─── Get All Product Statistics ──────────────────────────────────────────────

export function useAllProductStatistics(sortBy?: 'views_count' | 'add_to_cart_count' | 'purchases_count' | 'conversion_rate' | 'abandoned_cart_users') {
  return useQuery({
    queryKey: keys.allStats(sortBy),
    queryFn: () => getAllProductStatistics({ sortBy }),
  });
}

// ─── Get Product Events ──────────────────────────────────────────────────────

export function useProductEvents(productId: string | undefined, eventType?: ProductEventType) {
  return useQuery({
    queryKey: [...keys.productEvents(productId!), eventType],
    queryFn: () => getProductEvents(productId!, { eventType }),
    enabled: !!productId,
  });
}

// ─── Get Daily Stats ─────────────────────────────────────────────────────────

export function useProductDailyStats(productId: string | undefined, days: number = 30) {
  return useQuery({
    queryKey: keys.productDaily(productId!, days),
    queryFn: () => getProductDailyStats(productId!, days),
    enabled: !!productId,
  });
}

// ─── Get Cart Users ──────────────────────────────────────────────────────────

export function useCartUsers(productId: string | undefined) {
  return useQuery({
    queryKey: keys.cartUsers(productId!),
    queryFn: () => getCartUsers(productId!),
    enabled: !!productId,
  });
}

// ─── Record Event Mutation ───────────────────────────────────────────────────

export function useRecordProductEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      eventType,
      userId,
      sessionId,
    }: {
      productId: string;
      eventType: ProductEventType;
      userId?: string | null;
      sessionId?: string | null;
    }) => recordProductEvent(productId, eventType, userId, sessionId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: keys.product(variables.productId) });
    },
  });
}

// ─── Global Summary (all products) ──────────────────────────────────────────

export function useGlobalAnalyticsSummary() {
  return useQuery({
    queryKey: [...keys.all, 'global-summary'],
    queryFn: () => getGlobalAnalyticsSummary(),
  });
}

// ─── Top Products by Metric ──────────────────────────────────────────────────

export function useTopProducts(metric: TopProductMetric = 'views_count', limit = 5) {
  return useQuery({
    queryKey: [...keys.all, 'top', metric, limit],
    queryFn: () => getTopProducts(metric, limit),
  });
}

// ─── Global Daily Stats (all products) ──────────────────────────────────────

export function useGlobalDailyStats(days = 7) {
  return useQuery({
    queryKey: [...keys.all, 'global-daily', days],
    queryFn: () => getGlobalDailyStats(days),
  });
}

// ─── Refresh Statistics ──────────────────────────────────────────────────────

export function useRefreshProductStatistics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => refreshProductStatistics(productId),
    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: keys.product(productId) });
      queryClient.invalidateQueries({ queryKey: keys.allStats() });
    },
  });
}
