import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/services/notificationService';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (userId: string) => [...notificationKeys.all, userId] as const,
};

export function useNotifications() {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: notificationKeys.list(userId ?? ''),
    queryFn: () => getNotifications(userId!),
    enabled: !!userId,
    staleTime: 0, // always refetch — notifications must be fresh
  });

  // Realtime subscription: invalidate whenever a new notification row is inserted
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: notificationKeys.list(userId) }),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: notificationKeys.list(userId) }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return query;
}

export function useUnreadCount() {
  const { data } = useNotifications();
  return (data ?? []).filter((n) => !n.is_read).length;
}

export function useMarkRead() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user?.id);
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.list(userId ?? '') }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user?.id);
  return useMutation({
    mutationFn: () => markAllNotificationsRead(userId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.list(userId ?? '') }),
  });
}
