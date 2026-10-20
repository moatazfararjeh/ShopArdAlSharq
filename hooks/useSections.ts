import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/stores/toastStore';
import {
  getSections,
  getSectionById,
  getCategorySections,
  createSection,
  updateSection,
  deleteSection,
} from '@/services/sectionService';
import { SectionFormValues } from '@/schemas/sectionSchema';

export const sectionKeys = {
  all: ['sections'] as const,
  list: (activeOnly?: boolean) => [...sectionKeys.all, { activeOnly }] as const,
  detail: (id: string) => [...sectionKeys.all, id] as const,
};

export function useSections(activeOnly = true) {
  return useQuery({
    queryKey: sectionKeys.list(activeOnly),
    queryFn: () => getSections({ activeOnly }),
  });
}

/** Sections of the products in a category (home category filter). */
export function useCategorySections(categoryId?: string) {
  return useQuery({
    queryKey: [...sectionKeys.all, 'category', categoryId],
    queryFn: () => getCategorySections(categoryId!),
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSection(id: string) {
  return useQuery({
    queryKey: sectionKeys.detail(id),
    queryFn: () => getSectionById(id),
    enabled: !!id,
  });
}

export function useCreateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: SectionFormValues) =>
      createSection({
        name_ar: values.name_ar,
        name_en: values.name_en || null,
        description_ar: values.description_ar || null,
        description_en: values.description_en || null,
        image_url: values.image_url || null,
        sort_order: values.sort_order ? parseInt(values.sort_order) : 0,
        is_active: values.is_active,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: sectionKeys.all }),
  });
}

export function useUpdateSection(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: Partial<SectionFormValues>) =>
      updateSection(id, {
        name_ar: values.name_ar,
        name_en: values.name_en || null,
        description_ar: values.description_ar || null,
        description_en: values.description_en || null,
        image_url: values.image_url || null,
        sort_order: values.sort_order ? parseInt(values.sort_order) : undefined,
        is_active: values.is_active,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sectionKeys.all });
      qc.invalidateQueries({ queryKey: sectionKeys.detail(id) });
    },
  });
}

export function useDeleteSection() {
  const qc = useQueryClient();
  const { show: showToast } = useToastStore();
  return useMutation({
    mutationFn: deleteSection,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sectionKeys.all });
      // Categories under the deleted section now have section_id = NULL
      // (ON DELETE SET NULL), so their cached data is stale too.
      qc.invalidateQueries({ queryKey: ['categories'] });
      showToast('تم حذف القسم بنجاح', 'success');
    },
    onError: (err: Error) => {
      showToast('فشل حذف القسم: ' + err.message, 'error');
    },
  });
}
