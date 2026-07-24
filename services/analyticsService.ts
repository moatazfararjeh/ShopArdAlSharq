import { supabase } from '@/lib/supabase';
import { parseSupabaseError } from '@/lib/errors';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProductEventType =
  | 'view'
  | 'impression'
  | 'add_to_cart'
  | 'share'
  | 'wishlist'
  | 'purchase'
  | 'remove_from_cart';

export interface ProductStatistics {
  product_id: string;
  views_count: number;
  impressions_count: number;
  add_to_cart_count: number;
  shares_count: number;
  wishlist_count: number;
  purchases_count: number;
  unique_viewers: number;
  unique_cart_users: number;
  abandoned_cart_users: number;
  conversion_rate: number;
  avg_time_to_purchase: string | null;
  last_viewed_at: string | null;
  last_purchased_at: string | null;
  updated_at: string;
}

export interface ProductEvent {
  id: string;
  product_id: string;
  user_id: string | null;
  event_type: ProductEventType;
  session_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AnalyticsSummary {
  total_views: number;
  total_impressions: number;
  total_add_to_cart: number;
  total_shares: number;
  total_purchases: number;
  top_viewed_products: Array<{ product_id: string; name_ar: string; count: number }>;
  top_carted_products: Array<{ product_id: string; name_ar: string; count: number }>;
  top_abandoned_products: Array<{ product_id: string; name_ar: string; count: number }>;
}

// ─── Record Event ────────────────────────────────────────────────────────────

export async function recordProductEvent(
  productId: string,
  eventType: ProductEventType,
  userId?: string | null,
  sessionId?: string | null,
  metadata?: Record<string, unknown>
): Promise<string> {
  const { data, error } = await supabase.rpc('record_product_event', {
    p_product_id: productId,
    p_user_id: userId ?? null,
    p_event_type: eventType,
    p_session_id: sessionId ?? null,
    p_metadata: metadata ?? {},
  });

  if (error) throw new Error(parseSupabaseError(error));
  return data as string;
}

// ─── Get Statistics for a Product ────────────────────────────────────────────

export async function getProductStatistics(productId: string): Promise<ProductStatistics | null> {
  const { data, error } = await supabase
    .from('product_statistics')
    .select('*')
    .eq('product_id', productId)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(parseSupabaseError(error));
  return data;
}

// ─── Get Statistics for All Products ─────────────────────────────────────────

export async function getAllProductStatistics(options?: {
  sortBy?: 'views_count' | 'add_to_cart_count' | 'purchases_count' | 'conversion_rate' | 'abandoned_cart_users';
  order?: 'asc' | 'desc';
  limit?: number;
}): Promise<ProductStatistics[]> {
  const { sortBy = 'views_count', order = 'desc', limit = 50 } = options ?? {};

  const { data, error } = await supabase
    .from('product_statistics')
    .select('*')
    .order(sortBy, { ascending: order === 'asc' })
    .limit(limit);

  if (error) throw new Error(parseSupabaseError(error));
  return data ?? [];
}

// ─── Get Events Timeline for a Product ───────────────────────────────────────

export async function getProductEvents(
  productId: string,
  options?: { eventType?: ProductEventType; limit?: number; from?: string; to?: string }
): Promise<ProductEvent[]> {
  const { eventType, limit = 100, from, to } = options ?? {};

  let query = supabase
    .from('product_events')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (eventType) query = query.eq('event_type', eventType);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data, error } = await query;
  if (error) throw new Error(parseSupabaseError(error));
  return data ?? [];
}

export interface DailyStatEntry {
  date: string;
  views: number;
  add_to_cart: number;
  purchases: number;
  wishlist: number;
  shares: number;
  impressions: number;
}

// ─── Get Daily Stats for Charts ──────────────────────────────────────────────

export async function getProductDailyStats(
  productId: string,
  days: number = 30
): Promise<DailyStatEntry[]> {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const { data, error } = await supabase
    .from('product_events')
    .select('event_type, created_at')
    .eq('product_id', productId)
    .gte('created_at', fromDate.toISOString())
    .in('event_type', ['view', 'add_to_cart', 'purchase', 'wishlist', 'share', 'impression']);

  if (error) throw new Error(parseSupabaseError(error));

  const dailyMap: Record<string, Omit<DailyStatEntry, 'date'>> = {};

  for (const event of data ?? []) {
    const date = event.created_at.split('T')[0];
    if (!dailyMap[date]) {
      dailyMap[date] = { views: 0, add_to_cart: 0, purchases: 0, wishlist: 0, shares: 0, impressions: 0 };
    }
    switch (event.event_type) {
      case 'view':         dailyMap[date].views++;        break;
      case 'add_to_cart':  dailyMap[date].add_to_cart++;  break;
      case 'purchase':     dailyMap[date].purchases++;     break;
      case 'wishlist':     dailyMap[date].wishlist++;      break;
      case 'share':        dailyMap[date].shares++;        break;
      case 'impression':   dailyMap[date].impressions++;   break;
    }
  }

  return Object.entries(dailyMap)
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Refresh Statistics (admin action) ───────────────────────────────────────

export async function refreshProductStatistics(productId: string): Promise<void> {
  const { error } = await supabase.rpc('refresh_product_statistics', {
    p_product_id: productId,
  });
  if (error) throw new Error(parseSupabaseError(error));
}

// ─── Global Analytics Summary (all products) ─────────────────────────────────

export interface GlobalAnalyticsSummary {
  total_views: number;
  total_impressions: number;
  total_add_to_cart: number;
  total_shares: number;
  total_wishlist: number;
  total_purchases: number;
  total_unique_viewers: number;
  total_unique_cart_users: number;
  total_abandoned_cart_users: number;
  avg_conversion_rate: number;
  products_tracked: number;
}

export async function getGlobalAnalyticsSummary(): Promise<GlobalAnalyticsSummary> {
  const { data, error } = await supabase
    .from('product_statistics')
    .select('views_count, impressions_count, add_to_cart_count, shares_count, wishlist_count, purchases_count, unique_viewers, unique_cart_users, abandoned_cart_users, conversion_rate');

  if (error) throw new Error(parseSupabaseError(error));
  const rows = data ?? [];

  const total = (key: string) => rows.reduce((s: number, r: any) => s + (r[key] ?? 0), 0);

  return {
    total_views:               total('views_count'),
    total_impressions:         total('impressions_count'),
    total_add_to_cart:         total('add_to_cart_count'),
    total_shares:              total('shares_count'),
    total_wishlist:            total('wishlist_count'),
    total_purchases:           total('purchases_count'),
    total_unique_viewers:      total('unique_viewers'),
    total_unique_cart_users:   total('unique_cart_users'),
    total_abandoned_cart_users: total('abandoned_cart_users'),
    avg_conversion_rate: rows.length > 0
      ? Math.round(total('conversion_rate') / rows.length * 100) / 100
      : 0,
    products_tracked: rows.length,
  };
}

// ─── Top Products by Metric ───────────────────────────────────────────────────

export type TopProductMetric =
  | 'views_count'
  | 'add_to_cart_count'
  | 'purchases_count'
  | 'wishlist_count'
  | 'shares_count'
  | 'abandoned_cart_users'
  | 'conversion_rate';

export interface TopProduct {
  product_id: string;
  name_ar: string;
  name_en: string;
  count: number;
  image_url: string | null;
}

export async function getTopProducts(
  metric: TopProductMetric = 'views_count',
  limit: number = 5
): Promise<TopProduct[]> {
  const { data, error } = await supabase
    .from('product_statistics')
    .select(`product_id, ${metric}, products!inner(name_ar, name_en, product_images(url, is_primary))`)
    .order(metric, { ascending: false })
    .limit(limit);

  if (error) throw new Error(parseSupabaseError(error));

  return (data ?? []).map((row: any) => {
    const imgs: Array<{ url: string; is_primary: boolean }> = row.products?.product_images ?? [];
    const primaryImg = imgs.find((i) => i.is_primary) ?? imgs[0] ?? null;
    return {
      product_id: row.product_id,
      name_ar:    row.products?.name_ar ?? '',
      name_en:    row.products?.name_en ?? '',
      count:      row[metric] ?? 0,
      image_url:  primaryImg?.url ?? null,
    };
  });
}

// ─── Global Daily Stats (all products) ───────────────────────────────────────

export async function getGlobalDailyStats(days: number = 7): Promise<DailyStatEntry[]> {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - (days - 1));
  fromDate.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('product_events')
    .select('event_type, created_at')
    .gte('created_at', fromDate.toISOString())
    .in('event_type', ['view', 'add_to_cart', 'purchase', 'wishlist', 'share', 'impression']);

  if (error) throw new Error(parseSupabaseError(error));

  const dailyMap: Record<string, Omit<DailyStatEntry, 'date'>> = {};
  for (const event of data ?? []) {
    const date = event.created_at.split('T')[0];
    if (!dailyMap[date]) {
      dailyMap[date] = { views: 0, add_to_cart: 0, purchases: 0, wishlist: 0, shares: 0, impressions: 0 };
    }
    switch (event.event_type) {
      case 'view':        dailyMap[date].views++;       break;
      case 'add_to_cart': dailyMap[date].add_to_cart++; break;
      case 'purchase':    dailyMap[date].purchases++;    break;
      case 'wishlist':    dailyMap[date].wishlist++;     break;
      case 'share':       dailyMap[date].shares++;       break;
      case 'impression':  dailyMap[date].impressions++;  break;
    }
  }

  // Return a complete date range with zeroes for days with no events
  const result: DailyStatEntry[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    result.push({
      date: dateStr,
      ...(dailyMap[dateStr] ?? { views: 0, add_to_cart: 0, purchases: 0, wishlist: 0, shares: 0, impressions: 0 }),
    });
  }
  return result;
}

// ─── Get Users Who Added to Cart (for a product) ─────────────────────────────

export async function getCartUsers(productId: string): Promise<Array<{
  user_id: string;
  full_name: string | null;
  email: string;
  added_at: string;
  purchased: boolean;
}>> {
  const { data, error } = await supabase
    .from('product_events')
    .select('user_id, created_at, profiles!inner(full_name, email)')
    .eq('product_id', productId)
    .eq('event_type', 'add_to_cart')
    .not('user_id', 'is', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(parseSupabaseError(error));

  // Check which users also purchased
  const { data: purchaseEvents } = await supabase
    .from('product_events')
    .select('user_id')
    .eq('product_id', productId)
    .eq('event_type', 'purchase')
    .not('user_id', 'is', null);

  const purchasedUserIds = new Set((purchaseEvents ?? []).map((e: any) => e.user_id));

  return (data ?? []).map((event: any) => ({
    user_id: event.user_id,
    full_name: event.profiles?.full_name ?? null,
    email: event.profiles?.email ?? '',
    added_at: event.created_at,
    purchased: purchasedUserIds.has(event.user_id),
  }));
}
