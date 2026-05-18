import { useEffect } from 'react';
import { Slot, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { CustomerWebLayout } from '@/components/ui/CustomerWebLayout';

export default function CustomerWebLayoutRoute() {
  const { isAuthenticated, isInitialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.replace('/(public)/login');
    }
  }, [isAuthenticated, isInitialized]);

  if (!isAuthenticated) return null;

  return (
    <CustomerWebLayout>
      <Slot />
    </CustomerWebLayout>
  );
}
