import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function AdminLayout() {
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
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#e36523' },
        headerTintColor: '#fff',
      }}
    />
  );
}

