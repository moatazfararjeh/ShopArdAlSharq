import { supabase } from '@/lib/supabase';
import { parseSupabaseError } from '@/lib/errors';
import { Order } from '@/types/models';
import { CheckoutPayload, PlaceOrderResult } from '@/types/models';
import { OrderStatus } from '@/types/database.types';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

export interface GetOrdersParams {
  userId?: string;
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

export async function getOrders(params: GetOrdersParams = {}): Promise<Order[]> {
  const { userId, status, page = 0, limit = DEFAULT_PAGE_SIZE } = params;

  let query = supabase
    .from('orders')
    .select('*, order_items(*, products(name_ar, name_en, price, discount_price, is_featured, product_images(*)))')
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (userId) query = query.eq('user_id', userId);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw parseSupabaseError(error);
  // Normalize: Supabase returns the joined relation as `order_items`; map it to `items`.
  // Also normalize each item's joined product: Supabase uses the table name `products` (plural)
  // but our OrderItem type expects `product` (singular).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((o: any) => ({
    ...o,
    items: (o.order_items ?? []).map((item: any) => ({
      ...item,
      product: item.products ?? null,
    })),
  })) as unknown as Order[];
}

export async function getOrderById(orderId: string): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, profiles(full_name, phone, email, company_name), order_items(*, products(*, product_images(*)))')
    .eq('id', orderId)
    .single();
  if (error) throw parseSupabaseError(error);
  // Normalize order_items → items, products (plural join key) → product
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  return {
    ...d,
    profile: d.profiles ?? null,
    items: (d.order_items ?? []).map((item: any) => ({
      ...item,
      product: item.products ?? null,
    })),
  } as unknown as Order;
}

export async function placeOrder(payload: CheckoutPayload): Promise<PlaceOrderResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('place_order', {
    p_address_id: payload.address_id,
    p_payment_method: payload.payment_method,
    p_notes: payload.notes ?? null,
  });
  if (error) throw parseSupabaseError(error);
  return data as PlaceOrderResult;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  note?: string,
): Promise<Order> {
  const update: { status: OrderStatus; notes?: string } = { status };
  if (note) update.notes = note;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('orders') as any)
    .update(update)
    .eq('id', orderId)
    .select()
    .single();
  if (error) throw parseSupabaseError(error as { message: string; code?: string });
  return data as unknown as Order;
}
