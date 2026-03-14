import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

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

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
      <ActivityIndicator size="large" color="#f97316" />
    </View>
  );
}
