import { useQuery } from '@tanstack/react-query';
import { getUsers, getUserById, getRecentSignups } from '@/services/userService';
import { useAuthStore } from '@/stores/authStore';

export const userKeys = {
  all: ['users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
  detail: (id: string) => [...userKeys.all, id] as const,
};

export function useUsers() {
  const { isAdmin, isInitialized } = useAuthStore();
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: getUsers,
    enabled: isInitialized && isAdmin,
  });
}

export function useUserDetail(userId: string) {
  const { isAdmin, isInitialized } = useAuthStore();
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => getUserById(userId),
    enabled: isInitialized && isAdmin && !!userId,
    retry: false,
  });
}

export function useRecentSignups(days = 30) {
  const { isAdmin, isInitialized } = useAuthStore();
  return useQuery({
    queryKey: [...userKeys.all, 'recent', days],
    queryFn: () => getRecentSignups(days),
    enabled: isInitialized && isAdmin,
  });
}
