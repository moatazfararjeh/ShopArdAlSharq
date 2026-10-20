import { supabase } from '@/lib/supabase';
import { parseSupabaseError } from '@/lib/errors';
import { Category } from '@/types/models';

export interface GetCategoriesParams {
  activeOnly?: boolean;
  limit?: number;
}

export async function getCategories(params: GetCategoriesParams = {}): Promise<Category[]> {
  // Whole list by default: screens build pickers and name lookups from it, and the
  // Excel import matches names against it, so a short page silently drops rows.
  const { activeOnly = true, limit = 1000 } = params;

  let query = supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name_ar', { ascending: true })
    .limit(limit);

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw parseSupabaseError(error);
  return (data ?? []) as Category[];
}

export async function getCategoryById(id: string): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw parseSupabaseError(error);
  return data as Category;
}

export async function createCategory(
  payload: Pick<Category, 'name_ar' | 'name_en' | 'description_ar' | 'description_en' | 'sort_order' | 'is_active'> & { image_url?: string | null; section_id?: string | null },
): Promise<Category> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('categories') as any)
    .insert(payload)
    .select()
    .single();
  if (error) throw parseSupabaseError(error);
  return data as Category;
}

export async function updateCategory(
  id: string,
  payload: Partial<Pick<Category, 'name_ar' | 'name_en' | 'description_ar' | 'description_en' | 'sort_order' | 'is_active' | 'image_url' | 'section_id'>>,
): Promise<Category> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('categories') as any)
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw parseSupabaseError(error);
  return data as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw parseSupabaseError(error);
}
