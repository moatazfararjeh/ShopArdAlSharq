import { create } from 'zustand';
import { CartItem, CartSummary, findProductUnit, getEffectiveUnitPrice, getMinOrderQuantity } from '@/types/models';
import { MAX_CART_ITEM_QUANTITY } from '@/lib/constants';

interface CartState {
  items: CartItem[];
  summary: CartSummary;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, selectedUnit?: CartItem['selected_unit']) => void;
  updateQuantity: (productId: string, quantity: number, selectedUnit?: CartItem['selected_unit']) => void;
  changeUnit: (productId: string, oldUnit: CartItem['selected_unit'], newUnit: CartItem['selected_unit']) => void;
  clearCart: () => void;
  hydrateCart: (items: CartItem[]) => void;
}

/** Returns the effective unit price for a cart item, discount/flash-sale applied */
export function getCartItemPrice(item: CartItem): number {
  return getEffectiveUnitPrice(item.product, item.selected_unit);
}

// A line without a unit is the product's default unit, so "null" and the
// default unit's name are the same line.
function unitKey(item: CartItem): string | null {
  return item.selected_unit ?? findProductUnit(item.product)?.unit ?? null;
}

/** Line of this product in this unit; undefined unit = any line of the product. */
function matches(i: CartItem, productId: string, unit: CartItem['selected_unit'] | undefined): boolean {
  if (i.product_id !== productId) return false;
  if (unit === undefined) return true;
  return unitKey(i) === (unit ?? findProductUnit(i.product)?.unit ?? null);
}

function isSameItem(a: CartItem, b: CartItem): boolean {
  return a.product_id === b.product_id && unitKey(a) === unitKey(b);
}

function computeSummary(items: CartItem[]): CartSummary {
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + getCartItemPrice(i) * i.quantity, 0);
  // Before sales: each line's own unit price.
  const originalTotal = items.reduce(
    (sum, i) => sum + (findProductUnit(i.product, i.selected_unit)?.price ?? i.product.price) * i.quantity, 0);
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
      const minQty = getMinOrderQuantity(incomingItem.product, incomingItem.selected_unit);
      updated = [...items, { ...incomingItem, quantity: Math.min(Math.max(incomingItem.quantity, minQty), MAX_CART_ITEM_QUANTITY) }];
    }
    set({ items: updated, summary: computeSummary(updated) });
  },

  removeItem: (productId, selectedUnit) => {
    const updated = get().items.filter(
      (i) => !matches(i, productId, selectedUnit),
    );
    set({ items: updated, summary: computeSummary(updated) });
  },

  updateQuantity: (productId, quantity, selectedUnit) => {
    if (quantity <= 0) {
      get().removeItem(productId, selectedUnit);
      return;
    }
    const updated = get().items.map((i) =>
      matches(i, productId, selectedUnit)
        ? { ...i, quantity: Math.min(Math.max(quantity, getMinOrderQuantity(i.product, i.selected_unit)), MAX_CART_ITEM_QUANTITY) }
        : i,
    );
    set({ items: updated, summary: computeSummary(updated) });
  },

  changeUnit: (productId, oldUnit, newUnit) => {
    const { items } = get();
    const source = items.find((i) => matches(i, productId, oldUnit));
    if (!source) return;
    // Each unit has its own minimum.
    const qty = Math.max(source.quantity, getMinOrderQuantity(source.product, newUnit));
    const withoutSource = items.filter((i) => !matches(i, productId, oldUnit));
    const existingNew = withoutSource.find((i) => matches(i, productId, newUnit));
    let updated: CartItem[];
    if (existingNew) {
      updated = withoutSource.map((i) =>
        matches(i, productId, newUnit)
          ? { ...i, quantity: Math.min(i.quantity + qty, MAX_CART_ITEM_QUANTITY) }
          : i,
      );
    } else {
      updated = [...withoutSource, { ...source, quantity: Math.min(qty, MAX_CART_ITEM_QUANTITY), selected_unit: newUnit }];
    }
    set({ items: updated, summary: computeSummary(updated) });
  },

  clearCart: () => set({ items: [], summary: EMPTY_SUMMARY }),

  hydrateCart: (items) => set({ items, summary: computeSummary(items) }),
}));
