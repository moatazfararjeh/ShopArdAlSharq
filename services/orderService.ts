import { supabase } from '@/lib/supabase';
import { AppError, parseSupabaseError } from '@/lib/errors';
import { Order, SaleUnit } from '@/types/models';
import { CheckoutPayload, PlaceOrderResult } from '@/types/models';
import { OrderStatus } from '@/types/database.types';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

export interface GetOrdersParams {
  userId?: string;
  status?: OrderStatus;
  page?: number;
  limit?: number;
  /** Admin lists: also join the customer's profile (name, company, phone) */
  withCustomer?: boolean;
}

export async function getOrders(params: GetOrdersParams = {}): Promise<Order[]> {
  const { userId, status, page = 0, limit = DEFAULT_PAGE_SIZE, withCustomer = false } = params;

  const itemsSelect = 'order_items(*, products(name_ar, name_en, price, discount_price, is_featured, product_images(*)))';
  let query = supabase
    .from('orders')
    .select(withCustomer ? `*, profiles(full_name, phone, email, company_name), ${itemsSelect}` : `*, ${itemsSelect}`)
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
    profile: o.profiles ?? null,
    items: (o.order_items ?? []).map((item: any) => ({
      ...item,
      product: item.products ?? null,
    })),
  })) as unknown as Order[];
}

export async function getOrderById(orderId: string): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, profiles(full_name, phone, email, company_name), order_items(*, products(*, product_images(*), product_units(*)))')
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

export interface AdminOrderItemInput {
  product_id: string;
  /** Unit of the line; omitted = the product's existing line / default unit. */
  unit?: SaleUnit | null;
  quantity: number;
}

export interface AdminUpdateOrderResult {
  changed: boolean;
  total?: number;
  changes?: string[];
}

export async function adminUpdateOrderItems(
  orderId: string,
  items: AdminOrderItemInput[],
  note: string | null,
): Promise<AdminUpdateOrderResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('admin_update_order_items', {
    p_order_id: orderId,
    p_items: items,
    p_note: note,
  });
  if (error) {
    const msg = error.message ?? '';
    if (/^(INSUFFICIENT_STOCK|PRODUCT_UNAVAILABLE|UNIT_UNAVAILABLE|ORDER_NOT_EDITABLE|ORDER_NOT_FOUND|EMPTY_ORDER|FORBIDDEN)/.test(msg)) {
      throw new Error(msg);
    }
    throw parseSupabaseError(error);
  }
  return data as AdminUpdateOrderResult;
}

export async function placeOrder(payload: CheckoutPayload): Promise<PlaceOrderResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('place_order', {
    p_address_id: payload.address_id,
    p_payment_method: payload.payment_method,
    p_notes: payload.notes ?? null,
  });
  if (error) throw placeOrderError(error);
  return data as PlaceOrderResult;
}

/** place_order raises "CODE:detail"; turn the ones a customer can act on into Arabic messages. */
function placeOrderError(error: { message: string; code?: string }): Error {
  const msg = error.message ?? '';
  const detail = (code: string) => msg.slice(code.length + 1).replace(/\s*\(.*\)\s*$/, '').trim();
  const paren = msg.match(/\(([^)]*)\)\s*$/)?.[1];
  if (msg.startsWith('INSUFFICIENT_STOCK:')) {
    return new AppError('INSUFFICIENT_STOCK', `الكمية المتوفرة من "${detail('INSUFFICIENT_STOCK')}" لا تكفي لطلبك. قلّل الكمية وحاول مجدداً.`, 409);
  }
  if (msg.startsWith('BELOW_MIN_QUANTITY:')) {
    return new AppError('BELOW_MIN_QUANTITY', `الحد الأدنى لطلب "${detail('BELOW_MIN_QUANTITY')}" هو ${paren ?? ''}.`, 422);
  }
  if (msg.startsWith('UNIT_UNAVAILABLE:')) {
    return new AppError('UNIT_UNAVAILABLE', `"${detail('UNIT_UNAVAILABLE')}" لم يعد يُباع بوحدة ${paren ?? 'المختارة'}. غيّر الوحدة من السلة.`, 409);
  }
  if (msg.startsWith('PRODUCT_UNAVAILABLE:')) {
    return new AppError('PRODUCT_UNAVAILABLE', `"${detail('PRODUCT_UNAVAILABLE')}" غير متوفر حالياً. احذفه من السلة وأكمل الطلب.`, 409);
  }
  if (msg.startsWith('EMPTY_CART')) return new AppError('EMPTY_CART', 'السلة فارغة.', 400);
  if (msg.startsWith('INVALID_ADDRESS')) return new AppError('INVALID_ADDRESS', 'عنوان التوصيل غير صالح. اختر عنواناً آخر.', 400);
  return parseSupabaseError(error);
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
