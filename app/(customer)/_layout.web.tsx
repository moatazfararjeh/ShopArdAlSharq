import { ActivityIndicator, View } from 'react-native';
import { Redirect, Slot } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { CustomerWebLayout } from '@/components/ui/CustomerWebLayout';

export default function CustomerWebLayoutRoute() {
  const { isAuthenticated, isInitialized } = useAuth();

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

  return (
    <CustomerWebLayout>
      <Slot />
    </CustomerWebLayout>
  );
}
