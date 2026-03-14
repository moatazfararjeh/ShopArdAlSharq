import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/services/categoryService';
import { CategoryFormValues } from '@/schemas/categorySchema';

export const categoryKeys = {
  all: ['categories'] as const,
  list: (activeOnly?: boolean) => [...categoryKeys.all, { activeOnly }] as const,
  detail: (id: string) => [...categoryKeys.all, id] as const,
};

export function useCategories(activeOnly = true) {
  return useQuery({
    queryKey: categoryKeys.list(activeOnly),
    queryFn: () => getCategories({ activeOnly }),
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: () => getCategoryById(id),
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: CategoryFormValues) =>
      createCategory({
        name_ar: values.name_ar,
        name_en: values.name_en || null,
        description_ar: values.description_ar || null,
        description_en: values.description_en || null,
        sort_order: values.sort_order ? parseInt(values.sort_order) : 0,
        is_active: values.is_active,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export function useUpdateCategory(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: Partial<CategoryFormValues>) =>
      updateCategory(id, {
        name_ar: values.name_ar,
        name_en: values.name_en || null,
        description_ar: values.description_ar || null,
        description_en: values.description_en || null,
        sort_order: values.sort_order ? parseInt(values.sort_order) : undefined,
        is_active: values.is_active,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.all });
      qc.invalidateQueries({ queryKey: categoryKeys.detail(id) });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}
