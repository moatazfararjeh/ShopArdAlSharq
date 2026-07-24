import { supabase } from '@/lib/supabase';
import { parseSupabaseError } from '@/lib/errors';

export async function subscribeStockAlert(productId: string, userId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('stock_alerts')
    .upsert({ product_id: productId, user_id: userId, is_notified: false }, { onConflict: 'product_id,user_id' });
  if (error) throw new Error(parseSupabaseError(error));
}

export async function unsubscribeStockAlert(productId: string, userId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('stock_alerts')
    .delete()
    .eq('product_id', productId)
    .eq('user_id', userId);
  if (error) throw new Error(parseSupabaseError(error));
}

export async function getStockAlertStatus(productId: string, userId: string): Promise<boolean> {
  const { data, error } = await (supabase as any)
    .from('stock_alerts')
    .select('id')
    .eq('product_id', productId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(parseSupabaseError(error));
  return !!data;
}

export async function getStockAlertSubscriberCount(productId: string): Promise<number> {
  const { count, error } = await (supabase as any)
    .from('stock_alerts')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)
    .eq('is_notified', false);
  if (error) throw new Error(parseSupabaseError(error));
  return count ?? 0;
}

export async function markStockAlertsNotified(productId: string, userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;
  await (supabase as any)
    .from('stock_alerts')
    .update({ is_notified: true, notified_at: new Date().toISOString() })
    .eq('product_id', productId)
    .in('user_id', userIds);
}

export async function getStockAlertSubscribers(productId: string): Promise<Array<{ user_id: string; expo_push_token: string | null }>> {
  const { data, error } = await (supabase as any)
    .from('stock_alerts')
    .select('user_id, profiles!inner(expo_push_token)')
    .eq('product_id', productId)
    .eq('is_notified', false);
  if (error) throw new Error(parseSupabaseError(error));
  return (data ?? []).map((row: any) => ({
    user_id: row.user_id,
    expo_push_token: row.profiles?.expo_push_token ?? null,
  }));
}
