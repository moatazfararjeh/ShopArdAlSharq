import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  BannerPayload,
} from '@/services/bannerService';

export const bannerKeys = {
  all: ['banners'] as const,
  list: (activeOnly?: boolean) => [...bannerKeys.all, { activeOnly }] as const,
  detail: (id: string) => [...bannerKeys.all, id] as const,
};

export function useBanners(activeOnly = true) {
  return useQuery({
    queryKey: bannerKeys.list(activeOnly),
    queryFn: () => getBanners({ activeOnly }),
  });
}

export function useBanner(id: string) {
  return useQuery({
    queryKey: bannerKeys.detail(id),
    queryFn: () => getBannerById(id),
    enabled: !!id,
  });
}

export function useCreateBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BannerPayload) => createBanner(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: bannerKeys.all }),
  });
}

export function useUpdateBanner(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<BannerPayload>) => updateBanner(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bannerKeys.all });
      qc.invalidateQueries({ queryKey: bannerKeys.detail(id) });
    },
  });
}

export function useDeleteBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteBanner,
    onSuccess: () => qc.invalidateQueries({ queryKey: bannerKeys.all }),
  });
}
