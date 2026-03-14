import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Product } from '@/types/models';

const favKeys = {
  all: ['favorites'] as const,
  user: (userId: string) => [...favKeys.all, userId] as const,
};

const db = supabase as any;

async function getFavoriteIds(userId: string): Promise<string[]> {
  const { data, error } = await db
    .from('favorites')
    .select('product_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.product_id as string);
}

async function getFavoriteProducts(userId: string): Promise<Product[]> {
  const { data, error } = await db
    .from('favorites')
    .select('product_id, products(*, product_images(*))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => r.products as Product).filter(Boolean);
}

async function addFavorite(userId: string, productId: string) {
  const { error } = await db
    .from('favorites')
    .upsert({ user_id: userId, product_id: productId }, { onConflict: 'user_id,product_id' });
  if (error) throw error;
}

async function removeFavorite(userId: string, productId: string) {
  const { error } = await db
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);
  if (error) throw error;
}

/** Returns the set of favorited product IDs for the current user. */
export function useFavoriteIds() {
  const { session } = useAuthStore();
  return useQuery({
    queryKey: favKeys.user(session?.user.id ?? ''),
    queryFn: () => getFavoriteIds(session!.user.id),
    enabled: !!session,
    staleTime: 1000 * 60,
  });
}

/** Returns full Product objects for the current user's favorites. */
export function useFavoriteProducts() {
  const { session } = useAuthStore();
  return useQuery({
    queryKey: [...favKeys.user(session?.user.id ?? ''), 'products'],
    queryFn: () => getFavoriteProducts(session!.user.id),
    enabled: !!session,
    staleTime: 1000 * 60,
  });
}

/** Toggle a product in/out of the current user's favorites. */
export function useToggleFavorite() {
  const { session } = useAuthStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, isFavorited }: { productId: string; isFavorited: boolean }) => {
      if (!session) return;
      if (isFavorited) {
        await removeFavorite(session.user.id, productId);
      } else {
        await addFavorite(session.user.id, productId);
      }
    },
    onMutate: async ({ productId, isFavorited }) => {
      if (!session) return;
      const key = favKeys.user(session.user.id);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<string[]>(key) ?? [];
      // Optimistic update on the IDs query
      qc.setQueryData<string[]>(key, isFavorited
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
      );
      return { prev };
    },
    onError: (_err, _vars, ctx: any) => {
      if (!session || !ctx) return;
      qc.setQueryData(favKeys.user(session.user.id), ctx.prev);
    },
    onSettled: () => {
      if (!session) return;
      qc.invalidateQueries({ queryKey: favKeys.user(session.user.id) });
    },
  });
}
