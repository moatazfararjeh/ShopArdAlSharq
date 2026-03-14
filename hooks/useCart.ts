import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import * as cartService from '@/services/cartService';
import { CartItem } from '@/types/models';

const cartKeys = {
  all: ['cart'] as const,
  user: (userId: string) => [...cartKeys.all, userId] as const,
};

/** Loads the server cart and hydrates the Zustand store. Call once on app mount when authenticated. */
export function useCartSync() {
  const { session } = useAuthStore();
  const hydrateCart = useCartStore((s) => s.hydrateCart);

  const query = useQuery({
    queryKey: cartKeys.user(session?.user.id ?? ''),
    queryFn: () => cartService.getCartItems(session!.user.id),
    enabled: !!session,
  });

  useEffect(() => {
    if (query.data) hydrateCart(query.data);
  }, [query.data]);

  return query;
}

export function useCart() {
  const { items, summary, addItem, removeItem, updateQuantity, clearCart } = useCartStore();
  const { session } = useAuthStore();
  const qc = useQueryClient();

  const addMutation = useMutation({
    mutationFn: (item: CartItem) => {
      if (session) {
        return cartService.upsertCartItem(session.user.id, item.product_id, item.quantity, item.selected_unit);
      }
      return Promise.resolve();
    },
    onMutate: (item) => addItem(item),
    onSuccess: () => {
      if (session) qc.invalidateQueries({ queryKey: cartKeys.user(session.user.id) });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => {
      if (session) return cartService.removeCartItem(session.user.id, productId);
      return Promise.resolve();
    },
    onMutate: (productId) => removeItem(productId),
    onSuccess: () => {
      if (session) qc.invalidateQueries({ queryKey: cartKeys.user(session.user.id) });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => {
      if (session) return cartService.clearCartItems(session.user.id);
      return Promise.resolve();
    },
    onMutate: () => clearCart(),
  });

  return {
    items,
    summary,
    addItem: addMutation.mutate,
    removeItem: removeMutation.mutate,
    updateQuantity,
    clearCart: clearMutation.mutate,
  };
}
