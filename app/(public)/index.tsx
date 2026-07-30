import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';

export default function PublicIndex() {
  const { isAuthenticated, isInitialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;
    if (isAuthenticated) {
      router.replace('/(customer)/home');
    } else {
      router.replace('/(public)/login');
    }
  }, [isAuthenticated, isInitialized]);

  // Show a minimal loading indicator while auth initialises
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#e36523" />
    </View>
  );
}
