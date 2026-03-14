import { supabase } from '@/lib/supabase';
import { parseSupabaseError } from '@/lib/errors';
import { CartItem } from '@/types/models';

type CartIdResult = { id: string };

export async function getCartItems(userId: string): Promise<CartItem[]> {
  const { data: cart, error: cartError } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .single() as unknown as { data: CartIdResult | null; error: unknown };

  if (cartError || !cart) return [];

  const { data, error } = await supabase
    .from('cart_items')
    .select('*, products(*, product_images(*))')
    .eq('cart_id', cart.id);

  if (error) throw parseSupabaseError(error as { message: string; code?: string });

  // The join key from Supabase is `products` (table name), but CartItem expects `product`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped = (data ?? []).map((row: any) => ({
    ...row,
    product: row.products ?? row.product,
    products: undefined,
    selected_unit: row.selected_unit ?? null,
  }));
  return mapped as unknown as CartItem[];
}

export async function upsertCartItem(
  userId: string,
  productId: string,
  quantity: number,
  selectedUnit?: 'piece' | 'kg' | 'carton' | null,
): Promise<void> {
  // Get or create cart
  let cartId: string;
  const { data: existing } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .single() as unknown as { data: CartIdResult | null; error: unknown };

  if (existing) {
    cartId = existing.id;
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newCart, error: createError } = await (supabase.from('carts') as any)
      .insert({ user_id: userId })
      .select('id')
      .single() as { data: CartIdResult | null; error: unknown };
    if (createError) throw parseSupabaseError(createError as never);
    cartId = (newCart as CartIdResult)!.id;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('cart_items') as any).upsert(
    { cart_id: cartId, product_id: productId, quantity, ...(selectedUnit !== undefined ? { selected_unit: selectedUnit } : {}) },
    { onConflict: 'cart_id,product_id' },
  ) as { error: unknown };
  if (error) throw parseSupabaseError(error as { message: string; code?: string });
}

export async function removeCartItem(userId: string, productId: string): Promise<void> {
  const { data: cart } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .single() as unknown as { data: CartIdResult | null; error: unknown };

  if (!cart) return;

  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('cart_id', cart.id)
    .eq('product_id', productId);
  if (error) throw parseSupabaseError(error);
}

export async function clearCartItems(userId: string): Promise<void> {
  const { data: cart } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .single() as unknown as { data: CartIdResult | null; error: unknown };

  if (!cart) return;

  const { error } = await supabase.from('cart_items').delete().eq('cart_id', cart.id);
  if (error) throw parseSupabaseError(error);
}
