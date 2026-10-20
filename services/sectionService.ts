import { supabase } from '@/lib/supabase';
import { parseSupabaseError } from '@/lib/errors';
import { Section } from '@/types/models';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

export interface GetSectionsParams {
  activeOnly?: boolean;
  limit?: number;
}

export async function getSections(params: GetSectionsParams = {}): Promise<Section[]> {
  const { activeOnly = true, limit = DEFAULT_PAGE_SIZE } = params;

  let query = supabase
    .from('sections')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name_ar', { ascending: true })
    .limit(limit);

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw parseSupabaseError(error);
  return (data ?? []) as Section[];
}

export async function getSectionById(id: string): Promise<Section> {
  const { data, error } = await supabase
    .from('sections')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw parseSupabaseError(error);
  return data as Section;
}

export async function createSection(
  payload: Pick<Section, 'name_ar' | 'name_en' | 'description_ar' | 'description_en' | 'sort_order' | 'is_active'> & { image_url?: string | null },
): Promise<Section> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('sections') as any)
    .insert(payload)
    .select()
    .single();
  if (error) throw parseSupabaseError(error);
  return data as Section;
}

export async function updateSection(
  id: string,
  payload: Partial<Pick<Section, 'name_ar' | 'name_en' | 'description_ar' | 'description_en' | 'sort_order' | 'is_active' | 'image_url'>>,
): Promise<Section> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('sections') as any)
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw parseSupabaseError(error);
  return data as Section;
}

export async function deleteSection(id: string): Promise<void> {
  const { error } = await supabase.from('sections').delete().eq('id', id);
  if (error) throw parseSupabaseError(error);
}
