import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBrands, createBrand, updateBrand, deleteBrand } from '@/services/brandService';

export const brandKeys = {
  all: ['brands'] as const,
  list: (activeOnly?: boolean) => [...brandKeys.all, { activeOnly }] as const,
};

export function useBrands(activeOnly = true) {
  return useQuery({
    queryKey: brandKeys.list(activeOnly),
    queryFn: () => getBrands(activeOnly),
  });
}

export function useCreateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, sort_order, image_url }: { name: string; sort_order?: number; image_url?: string | null }) => createBrand(name, sort_order, image_url),
    onSuccess: () => qc.invalidateQueries({ queryKey: brandKeys.all }),
  });
}

export function useUpdateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; name?: string; is_active?: boolean; sort_order?: number; image_url?: string | null }) =>
      updateBrand(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: brandKeys.all }),
  });
}

export function useDeleteBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBrand(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: brandKeys.all }),
  });
}
