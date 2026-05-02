import { supabase } from '@/lib/supabase';
import { parseSupabaseError } from '@/lib/errors';
import { Profile } from '@/types/models';

export interface UserWithStats extends Profile {
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
}

export async function getUsers(): Promise<UserWithStats[]> {
  // Fetch all profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw parseSupabaseError(error);

  if (!profiles || profiles.length === 0) return [];

  // Fetch order aggregates per user
  const { data: orderStats, error: orderError } = await supabase
    .from('orders')
    .select('user_id, total_amount, created_at')
    .eq('status', 'delivered');
  if (orderError) throw parseSupabaseError(orderError);

  // Fetch all orders count per user (all statuses except cancelled)
  const { data: allOrders, error: allOrdersError } = await supabase
    .from('orders')
    .select('user_id, created_at')
    .neq('status', 'cancelled');
  if (allOrdersError) throw parseSupabaseError(allOrdersError);

  // Build lookup maps
  const spentMap: Record<string, number> = {};
  const lastOrderMap: Record<string, string> = {};
  const orderCountMap: Record<string, number> = {};

  for (const o of (orderStats ?? [])) {
    spentMap[o.user_id] = (spentMap[o.user_id] ?? 0) + (o.total_amount ?? 0);
  }
  for (const o of (allOrders ?? [])) {
    orderCountMap[o.user_id] = (orderCountMap[o.user_id] ?? 0) + 1;
    if (!lastOrderMap[o.user_id] || o.created_at > lastOrderMap[o.user_id]) {
      lastOrderMap[o.user_id] = o.created_at;
    }
  }

  return (profiles as Profile[]).map((p) => ({
    ...p,
    total_orders: orderCountMap[p.id] ?? 0,
    total_spent: spentMap[p.id] ?? 0,
    last_order_at: lastOrderMap[p.id] ?? null,
  }));
}

export async function getUserById(userId: string): Promise<UserWithStats> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw parseSupabaseError(error);

  const { data: orders } = await supabase
    .from('orders')
    .select('total_amount, created_at, status')
    .eq('user_id', userId)
    .neq('status', 'cancelled');

  const total_orders = orders?.length ?? 0;
  const total_spent = (orders ?? [])
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.total_amount ?? 0), 0);
  const last_order_at = (orders ?? []).reduce<string | null>((latest, o) => {
    return !latest || o.created_at > latest ? o.created_at : latest;
  }, null);

  return { ...(profile as Profile), total_orders, total_spent, last_order_at };
}
