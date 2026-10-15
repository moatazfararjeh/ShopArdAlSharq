import { supabase } from '@/lib/supabase';
import { parseSupabaseError } from '@/lib/errors';

export interface ErrorLogEntry {
  id: string;
  user_id: string | null;
  message: string;
  stack: string | null;
  context: string | null;
  platform: string | null;
  app_version: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  profiles: { email: string; full_name: string | null } | null;
}

export async function getErrorLogs(limit = 200): Promise<ErrorLogEntry[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('error_logs') as any)
    .select('*, profiles(email, full_name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw parseSupabaseError(error);
  return (data ?? []) as ErrorLogEntry[];
}

export async function deleteErrorLog(id: string): Promise<void> {
  const { error } = await supabase.from('error_logs').delete().eq('id', id);
  if (error) throw parseSupabaseError(error);
}

export async function clearErrorLogs(): Promise<void> {
  const { error } = await supabase.from('error_logs').delete().gte('created_at', '1970-01-01T00:00:00Z');
  if (error) throw parseSupabaseError(error);
}
