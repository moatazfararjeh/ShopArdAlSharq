import { useQuery, useMutation, useQueryClient, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import {
  getProducts,
  getProductById,
  getFeaturedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  GetProductsParams,
} from '@/services/productService';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: GetProductsParams) => [...productKeys.lists(), params] as const,
  featured: () => [...productKeys.all, 'featured'] as const,
  detail: (id: string) => [...productKeys.all, id] as const,
};

export function useProducts(
  params: Omit<GetProductsParams, 'page'> = {},
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: productKeys.list(params),
    queryFn: ({ pageParam = 0 }) =>
      getProducts({ ...params, page: pageParam as number, limit: DEFAULT_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length : undefined,
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

/** Single-page fetch — used for web pagination and per-category sections. */
export function useProductsPage(
  params: GetProductsParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: [...productKeys.list(params), 'page', params.page ?? 0],
    queryFn: () => getProducts(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    enabled: options.enabled ?? true,
  });
}

export function useFeaturedProducts(limit = 6) {
  return useQuery({
    queryKey: productKeys.featured(),
    queryFn: () => getFeaturedProducts(limit),
  });
}

export function useProduct(id: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => getProductById(id),
    enabled: !!id,
    // Pre-populate from the list/page caches so the detail page renders
    // instantly when navigating from any product list (no blank loading screen).
    initialData: () => {
      const allCached = qc.getQueriesData<any>({ queryKey: productKeys.lists() });
      for (const [, result] of allCached) {
        // Infinite query pages
        const pages: any[] = result?.pages ?? [result];
        for (const page of pages) {
          const items: any[] = Array.isArray(page?.data) ? page.data : Array.isArray(page) ? page : [];
          const found = items.find((p) => p?.id === id);
          if (found) return found;
        }
      }
      return undefined;
    },
    // initialData is always treated as stale so a background refetch fires
    // immediately to get the full detail (images, etc.)
    initialDataUpdatedAt: 0,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.lists() }),
  });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof updateProduct>[1]) => updateProduct(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.lists() });
      qc.invalidateQueries({ queryKey: productKeys.detail(id) });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.lists() }),
  });
}
