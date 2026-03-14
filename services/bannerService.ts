import { supabase } from '@/lib/supabase';
import { parseSupabaseError } from '@/lib/errors';
import { Banner } from '@/types/models';

export interface GetBannersParams {
  activeOnly?: boolean;
}

export async function getBanners(params: GetBannersParams = {}): Promise<Banner[]> {
  const { activeOnly = true } = params;

  let query = supabase
    .from('banners')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw parseSupabaseError(error);
  return (data ?? []) as Banner[];
}

export async function getBannerById(id: string): Promise<Banner> {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw parseSupabaseError(error);
  return data as Banner;
}

export type BannerPayload = Pick<
  Banner,
  | 'title_ar'
  | 'title_en'
  | 'subtitle_ar'
  | 'subtitle_en'
  | 'label_ar'
  | 'label_en'
  | 'button_text_ar'
  | 'button_text_en'
  | 'emoji'
  | 'image_url'
  | 'bg_color'
  | 'is_active'
  | 'sort_order'
>;

export async function createBanner(payload: BannerPayload): Promise<Banner> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('banners') as any)
    .insert(payload)
    .select()
    .single();
  if (error) throw parseSupabaseError(error);
  return data as Banner;
}

export async function updateBanner(id: string, payload: Partial<BannerPayload>): Promise<Banner> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('banners') as any)
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw parseSupabaseError(error);
  return data as Banner;
}

export async function deleteBanner(id: string): Promise<void> {
  const { error } = await supabase.from('banners').delete().eq('id', id);
  if (error) throw parseSupabaseError(error);
}
