import { ActivityIndicator, View } from 'react-native';
import { Redirect, Slot, usePathname } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { CustomerWebLayout } from '@/components/ui/CustomerWebLayout';

// Pages accessible without login
const PUBLIC_PAGES = ['/catalog'];
// Pages rendered without the CustomerWebLayout chrome (header/footer/menu)
const STANDALONE_PAGES = ['/catalog'];

export default function CustomerWebLayoutRoute() {
  const { isAuthenticated, isInitialized } = useAuth();
  const pathname = usePathname();

  const isPublicPage = PUBLIC_PAGES.includes(pathname);
  const isStandalone = STANDALONE_PAGES.includes(pathname);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#e36523" />
      </View>
    );
  }

  if (!isAuthenticated && !isPublicPage) {
    return <Redirect href="/(public)/login" />;
  }

  if (isStandalone) {
    return <Slot />;
  }

  return (
    <CustomerWebLayout>
      <Slot />
    </CustomerWebLayout>
  );
}
