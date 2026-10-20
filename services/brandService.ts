import { supabase } from '@/lib/supabase';
import { parseSupabaseError } from '@/lib/errors';
import { Brand, Category } from '@/types/models';

export async function getBrands(activeOnly = true): Promise<Brand[]> {
  let query = supabase
    .from('brands')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) throw parseSupabaseError(error);
  return (data ?? []) as unknown as Brand[];
}

/** Active brands that have at least one available product in this category. */
export async function getCategoryBrands(categoryId: string): Promise<Brand[]> {
  const { data, error } = await supabase
    .from('products')
    .select('brand_id, brands(*)')
    .eq('category_id', categoryId)
    .eq('is_available', true)
    .not('brand_id', 'is', null);
  if (error) throw parseSupabaseError(error);

  const byId = new Map<string, Brand>();
  for (const row of (data ?? []) as any[]) {
    const b = row.brands as Brand | null;
    if (b && b.is_active !== false && !byId.has(b.id)) byId.set(b.id, b);
  }
  return [...byId.values()].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, 'ar'),
  );
}

/** Active categories in which this brand has at least one available product. */
export async function getBrandCategories(brandId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('products')
    .select('category_id, categories(*)')
    .eq('brand_id', brandId)
    .eq('is_available', true);
  if (error) throw parseSupabaseError(error);

  const byId = new Map<string, Category>();
  for (const row of (data ?? []) as any[]) {
    const c = row.categories as Category | null;
    if (c && (c as any).is_active !== false && !byId.has(c.id)) byId.set(c.id, c);
  }
  return [...byId.values()].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export async function createBrand(name: string, sort_order = 0, image_url?: string | null): Promise<Brand> {
  const { data, error } = await supabase
    .from('brands')
    .insert({ name, sort_order, image_url: image_url ?? null })
    .select()
    .single();
  if (error) throw parseSupabaseError(error);
  return data as unknown as Brand;
}

export async function updateBrand(id: string, payload: Partial<Pick<Brand, 'name' | 'is_active' | 'sort_order' | 'image_url'>>): Promise<Brand> {
  const { data, error } = await supabase
    .from('brands')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw parseSupabaseError(error);
  return data as unknown as Brand;
}

export async function deleteBrand(id: string): Promise<void> {
  const { error } = await supabase.from('brands').delete().eq('id', id);
  if (error) throw parseSupabaseError(error);
}
