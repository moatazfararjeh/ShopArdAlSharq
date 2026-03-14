import { supabase } from '@/lib/supabase';
import { parseSupabaseError } from '@/lib/errors';
import { Category } from '@/types/models';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

export interface GetCategoriesParams {
  activeOnly?: boolean;
  limit?: number;
}

export async function getCategories(params: GetCategoriesParams = {}): Promise<Category[]> {
  const { activeOnly = true, limit = DEFAULT_PAGE_SIZE } = params;

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
  payload: Pick<Category, 'name_ar' | 'name_en' | 'description_ar' | 'description_en' | 'sort_order' | 'is_active'>,
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
  payload: Partial<Pick<Category, 'name_ar' | 'name_en' | 'description_ar' | 'description_en' | 'sort_order' | 'is_active' | 'image_url'>>,
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
