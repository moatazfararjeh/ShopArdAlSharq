import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

/**
 * Persists an error to the `error_logs` table so it's visible from Studio
 * without needing the customer to report it. Never throws — a logging
 * failure must not mask or replace the original error.
 */
export function logError(
  error: unknown,
  context: string,
  options?: { userId?: string | null; metadata?: Record<string, unknown> },
): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? (error.stack ?? null) : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  void (supabase.from('error_logs') as any)
    .insert({
      user_id: options?.userId ?? null,
      message,
      stack,
      context,
      platform: Platform.OS,
      app_version: Constants.expoConfig?.version ?? null,
      metadata: options?.metadata ?? {},
    })
    .catch(() => {});
}
