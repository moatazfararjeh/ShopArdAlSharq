import { supabase } from '@/lib/supabase';
import { parseSupabaseError } from '@/lib/errors';
import { Section } from '@/types/models';

export interface GetSectionsParams {
  activeOnly?: boolean;
  limit?: number;
}

export async function getSections(params: GetSectionsParams = {}): Promise<Section[]> {
  // Whole list by default: screens build pickers and name lookups from it, and the
  // Excel import matches names against it, so a short page silently drops rows.
  const { activeOnly = true, limit = 1000 } = params;

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

/** Active sections that have at least one available product in this category. */
export async function getCategorySections(categoryId: string): Promise<Section[]> {
  const { data, error } = await supabase
    .from('products')
    .select('section_id, sections(*)')
    .eq('category_id', categoryId)
    .eq('is_available', true)
    .not('section_id', 'is', null);
  if (error) throw parseSupabaseError(error);

  const byId = new Map<string, Section>();
  for (const row of (data ?? []) as any[]) {
    const sec = row.sections as Section | null;
    if (sec && sec.is_active !== false && !byId.has(sec.id)) byId.set(sec.id, sec);
  }
  return [...byId.values()].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name_ar.localeCompare(b.name_ar, 'ar'),
  );
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
