import { supabase } from '@/lib/supabase';

export interface AppVersionConfig {
  ios_min_version: string;
  android_min_version: string;
  update_message_ar: string;
}

export async function getAppVersionConfig(): Promise<AppVersionConfig | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('app_version_config')
    .select('ios_min_version, android_min_version, update_message_ar')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return data as AppVersionConfig | null;
}
