import { create } from 'zustand';
import { CartItem, CartSummary } from '@/types/models';
import { MAX_CART_ITEM_QUANTITY } from '@/lib/constants';

interface CartState {
  items: CartItem[];
  summary: CartSummary;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, selectedUnit?: CartItem['selected_unit']) => void;
  updateQuantity: (productId: string, quantity: number, selectedUnit?: CartItem['selected_unit']) => void;
  clearCart: () => void;
  hydrateCart: (items: CartItem[]) => void;
}

/** Returns the effective unit price for a cart item */
export function getCartItemPrice(item: CartItem): number {
  if (item.selected_unit === 'piece' && item.product.price_per_piece != null) {
    return item.product.price_per_piece;
  }
  if (item.selected_unit === 'kg' && item.product.price_per_kg != null) {
    return item.product.price_per_kg;
  }
  if (item.selected_unit === 'carton' && item.product.price_per_carton != null) {
    return item.product.price_per_carton;
  }
  return item.product.discount_price ?? item.product.price;
}

function isSameItem(a: CartItem, b: CartItem): boolean {
  return a.product_id === b.product_id && a.selected_unit === b.selected_unit;
}

function computeSummary(items: CartItem[]): CartSummary {
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + getCartItemPrice(i) * i.quantity, 0);
  const originalTotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const discount = Math.max(0, originalTotal - subtotal);
  return { items, itemCount, subtotal, discount, total: subtotal };
}

const EMPTY_SUMMARY: CartSummary = { items: [], itemCount: 0, subtotal: 0, discount: 0, total: 0 };

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  summary: EMPTY_SUMMARY,

  addItem: (incomingItem) => {
    const { items } = get();
    const existing = items.find((i) => isSameItem(i, incomingItem));
    let updated: CartItem[];
    if (existing) {
      updated = items.map((i) =>
        isSameItem(i, incomingItem)
          ? { ...i, quantity: Math.min(i.quantity + incomingItem.quantity, MAX_CART_ITEM_QUANTITY) }
          : i,
      );
    } else {
      updated = [...items, { ...incomingItem, quantity: Math.min(incomingItem.quantity, MAX_CART_ITEM_QUANTITY) }];
    }
    set({ items: updated, summary: computeSummary(updated) });
  },

  removeItem: (productId, selectedUnit) => {
    const updated = get().items.filter(
      (i) => !(i.product_id === productId && (selectedUnit === undefined || i.selected_unit === selectedUnit)),
    );
    set({ items: updated, summary: computeSummary(updated) });
  },

  updateQuantity: (productId, quantity, selectedUnit) => {
    if (quantity <= 0) {
      get().removeItem(productId, selectedUnit);
      return;
    }
    const clamped = Math.min(quantity, MAX_CART_ITEM_QUANTITY);
    const updated = get().items.map((i) =>
      i.product_id === productId && (selectedUnit === undefined || i.selected_unit === selectedUnit)
        ? { ...i, quantity: clamped }
        : i,
    );
    set({ items: updated, summary: computeSummary(updated) });
  },

  clearCart: () => set({ items: [], summary: EMPTY_SUMMARY }),

  hydrateCart: (items) => set({ items, summary: computeSummary(items) }),
}));
