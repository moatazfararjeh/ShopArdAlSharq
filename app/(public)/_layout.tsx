import { ActivityIndicator, View } from 'react-native';
import { Stack, Redirect, usePathname, useGlobalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { safeNext } from '@/lib/navigation';

// Screens the form itself lives on — not the whole public group, which also
// hosts the catalog/product pages that stay browsable while logged in.
const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

export default function PublicLayout() {
  const { isAuthenticated, isInitialized } = useAuth();
  const pathname = usePathname();
  const { next } = useGlobalSearchParams<{ next?: string }>();

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#e36523" />
      </View>
    );
  }

  // Login now uses router.push (not replace), so Back can land a logged-in
  // user back on /login — send them straight to home instead of the form.
  if (isAuthenticated && AUTH_PATHS.includes(pathname)) {
    // Signed in from a "log in to continue" link: go back there (e.g. the cart).
    return <Redirect href={(safeNext(next) ?? '/(customer)/home') as any} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}

