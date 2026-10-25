import { Platform } from 'react-native';
import { getClientSource } from '@/lib/clientSource';
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
  // The friendly message hides what the database said; log that too.
  const sourceError = (error as { sourceError?: unknown } | null)?.sourceError;

  // supabase-js's query builder is only "thenable" (implements .then, not a
  // real Promise), so .catch() isn't guaranteed to exist on it directly —
  // that threw "catch is not a function" at runtime. Promise.resolve(...)
  // adopts the thenable into a real Promise first, where .catch() is safe.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Promise.resolve(
    (supabase.from('error_logs') as any).insert({
      user_id: options?.userId ?? null,
      message,
      stack,
      context,
      platform: Platform.OS,
      app_version: getClientSource().appVersion,
      metadata: { ...(options?.metadata ?? {}), ...(sourceError ? { db_error: sourceError } : {}) },
    }),
  ).catch(() => {});
}
