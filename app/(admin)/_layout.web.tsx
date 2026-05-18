import { useEffect } from 'react';
import { Slot, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { AdminWebLayout } from '@/components/ui/AdminWebLayout';

export default function AdminWebLayoutRoute() {
  const { isAuthenticated, isAdmin, isInitialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) {
      router.replace('/(public)/login');
    } else if (!isAdmin) {
      router.replace('/(customer)/home');
    }
  }, [isAuthenticated, isAdmin, isInitialized]);

  if (!isAuthenticated || !isAdmin) return null;

  return (
    <AdminWebLayout>
      <Slot />
    </AdminWebLayout>
  );
}
