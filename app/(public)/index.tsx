import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';

export default function PublicIndex() {
  const { isAuthenticated, isInitialized } = useAuth();

  // Safety fallback: _layout.tsx waits for isInitialized before rendering the
  // Stack, so this branch should never be reached in the normal flow.
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#e36523" />
      </View>
    );
  }

  // Declarative redirect — no useEffect / router.replace() race condition.
  if (isAuthenticated) {
    return <Redirect href="/(customer)/home" />;
  }
  return <Redirect href="/(public)/login" />;
}
