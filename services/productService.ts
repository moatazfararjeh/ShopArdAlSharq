import { supabase } from '@/lib/supabase';
import { parseSupabaseError } from '@/lib/errors';
import { Product } from '@/types/models';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

export interface GetProductsParams {
  categoryId?: string;
  search?: string;
  featured?: boolean;
  availableOnly?: boolean;
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'name';
  page?: number;
  limit?: number;
}

export interface ProductsPage {
  data: Product[];
  count: number;
  hasMore: boolean;
}

export async function getProducts(params: GetProductsParams = {}): Promise<ProductsPage> {
  const {
    categoryId,
    search,
    featured,
    availableOnly = true,
    sortBy = 'newest',
    page = 0,
    limit = DEFAULT_PAGE_SIZE,
  } = params;

  let query = supabase
    .from('products')
    .select('*, product_images(*)', { count: 'exact' })
    .range(page * limit, (page + 1) * limit - 1);

  if (availableOnly) query = query.eq('is_available', true);
  if (categoryId) query = query.eq('category_id', categoryId);
  if (featured !== undefined) query = query.eq('is_featured', featured);
  if (search) query = query.ilike('name_ar', `%${search}%`);

  switch (sortBy) {
    case 'price_asc':
      query = query.order('price', { ascending: true });
      break;
    case 'price_desc':
      query = query.order('price', { ascending: false });
      break;
    case 'name':
      query = query.order('name_ar', { ascending: true });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }

  const { data, error, count } = await query;
  if (error) throw parseSupabaseError(error);

  const total = count ?? 0;
  return {
    data: (data ?? []) as unknown as Product[],
    count: total,
    hasMore: (page + 1) * limit < total,
  };
}

export async function getProductById(id: string): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_images(*), categories(name_ar, name_en)')
    .eq('id', id)
    .single();
  if (error) throw parseSupabaseError(error);
  return data as unknown as Product;
}

export async function getFeaturedProducts(limit = 6): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_images(*)')
    .eq('is_available', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw parseSupabaseError(error);
  return (data ?? []) as unknown as Product[];
}

export async function createProduct(
  payload: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'images' | 'product_images' | 'categories'>,
): Promise<Product> {
  // Strip undefined values so Supabase doesn't try to write columns that may
  // not exist yet (e.g. unit_type before migration 020 is applied).
  const clean = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined),
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('products') as any)
    .insert(clean)
    .select()
    .single();
  if (error) throw parseSupabaseError(error as { message: string; code?: string });
  return data as unknown as Product;
}

export async function updateProduct(
  id: string,
  payload: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at' | 'images' | 'product_images' | 'categories'>>,
): Promise<Product> {
  // Strip undefined values so Supabase doesn't try to write columns that may
  // not exist yet (e.g. unit_type before migration 020 is applied).
  const clean = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined),
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('products') as any)
    .update(clean)
    .eq('id', id)
    .select()
    .single();
  if (error) throw parseSupabaseError(error as { message: string; code?: string });
  return data as unknown as Product;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw parseSupabaseError(error);
}
