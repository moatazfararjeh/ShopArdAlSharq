import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useCartStore, cartLineUnit, matches } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import * as cartService from '@/services/cartService';
import { useToastStore } from '@/stores/toastStore';
import { CartItem, getMinOrderQuantity, UNIT_LABELS } from '@/types/models';

/**
 * TEMPORARY (migration 060): while app versions from before per-unit carts are
 * still in use, the database allows only one line per product. Turn off — and
 * drop cart_items_one_line_per_product — once most phones run iOS build 46 /
 * the matching Android update.
 */
const ONE_LINE_PER_PRODUCT = true;

type Unit = CartItem['selected_unit'];

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

/** The store's line for this product + unit (after an optimistic update). */
function currentLine(productId: string, unit: Unit): CartItem | undefined {
  return useCartStore.getState().items.find((i) => matches(i, productId, unit));
}

// Cart lines are per product *and* unit: 3 pieces and 1 carton of the same
// product are two lines, saved and removed separately.
export function useCart() {
  const { items, summary, addItem, removeItem, updateQuantity, changeUnit, clearCart } = useCartStore();
  const { session } = useAuthStore();
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);
  const refresh = () => { if (session) qc.invalidateQueries({ queryKey: cartKeys.user(session.user.id) }); };

  const addMutation = useMutation({
    mutationFn: (item: CartItem) => {
      if (!session) return Promise.resolve();
      const unit = cartLineUnit(item);
      // Save the line's total after merging, not just the quantity being added.
      const line = currentLine(item.product_id, unit);
      return cartService.upsertCartItem(session.user.id, item.product_id, line?.quantity ?? item.quantity, unit);
    },
    onMutate: (item) => addItem(item),
    onSuccess: refresh,
    // e.g. the database refused a second unit of the same product: reload the real cart.
    onError: () => {
      refresh();
      showToast('تعذّر تحديث السلة. حاول مجدداً.', 'error');
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ productId, unit }: { productId: string; unit?: Unit }) => {
      if (session) return cartService.removeCartItem(session.user.id, productId, unit);
      return Promise.resolve();
    },
    onMutate: ({ productId, unit }) => removeItem(productId, unit),
    onSuccess: refresh,
  });

  const clearMutation = useMutation({
    mutationFn: () => {
      if (session) return cartService.clearCartItems(session.user.id);
      return Promise.resolve();
    },
    onMutate: () => clearCart(),
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({ productId, quantity, unit }: { productId: string; quantity: number; unit: Unit }) => {
      if (!session) return Promise.resolve();
      if (quantity <= 0) return cartService.removeCartItem(session.user.id, productId, unit);
      return cartService.upsertCartItem(session.user.id, productId, quantity, unit);
    },
    onMutate: ({ productId, quantity, unit }) => updateQuantity(productId, quantity, unit),
    onSuccess: refresh,
  });

  const changeUnitMutation = useMutation({
    mutationFn: async ({ productId, from, to }: { productId: string; from: Unit; to: Unit }) => {
      if (!session) return;
      // The old unit's line goes; the new unit's line gets the merged quantity.
      await cartService.removeCartItem(session.user.id, productId, from);
      const line = currentLine(productId, to);
      if (line) await cartService.upsertCartItem(session.user.id, productId, line.quantity, to);
    },
    onMutate: ({ productId, from, to }) => changeUnit(productId, from, to),
    onSuccess: refresh,
  });

  return {
    items,
    summary,
    /** Add to the cart; returns false (and explains why) when it wasn't added. */
    addItem: (item: CartItem): boolean => {
      if (ONE_LINE_PER_PRODUCT) {
        const other = items.find((i) => i.product_id === item.product_id && cartLineUnit(i) !== cartLineUnit(item));
        if (other) {
          const inCart = cartLineUnit(other);
          showToast(`المنتج موجود في السلة بوحدة ${inCart ? UNIT_LABELS[inCart] : 'أخرى'}. غيّر الوحدة أو الكمية من السلة.`, 'error');
          return false;
        }
      }
      addMutation.mutate(item);
      return true;
    },
    /** Remove one unit's line; without a unit, every line of the product. */
    removeItem: (productId: string, unit?: Unit) => {
      const line = unit === undefined ? undefined : items.find((i) => matches(i, productId, unit));
      removeMutation.mutate({ productId, unit: line ? cartLineUnit(line) : unit });
    },
    /** Set the quantity of one line; without a unit, the product's default-unit line. */
    updateQuantity: (productId: string, quantity: number, unit?: Unit) => {
      const item = items.find((i) => matches(i, productId, unit ?? null));
      const lineUnit = item ? cartLineUnit(item) : unit ?? null;
      const next = quantity > 0 && item ? Math.max(quantity, getMinOrderQuantity(item.product, lineUnit)) : quantity;
      updateQuantityMutation.mutate({ productId, quantity: next, unit: lineUnit });
    },
    changeUnit: (productId: string, from: Unit, to: Unit) => changeUnitMutation.mutate({ productId, from, to }),
    clearCart: clearMutation.mutate,
  };
}
