import { ActivityIndicator, View } from 'react-native';
import { Redirect, Slot } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { AdminWebLayout } from '@/components/ui/AdminWebLayout';

export default function AdminWebLayoutRoute() {
  const { isAuthenticated, isAdmin, isInitialized } = useAuth();

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#e36523" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(public)/login" />;
  }

  if (!isAdmin) {
    return <Redirect href="/(customer)/home" />;
  }

  return (
    <AdminWebLayout>
      <Slot />
    </AdminWebLayout>
  );
}
