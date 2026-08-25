import { View } from 'react-native';
import { Stack, Redirect, usePathname } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

const AUTH_PATHS = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
// Screens the form itself lives on — excludes '/', which already redirects
// declaratively via app/(public)/index.tsx.
const LOGIN_FORM_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

/**
 * On web, auth screens (login / register / forgot-password) are shown as a
 * centered card (max 480 px).  All other public pages (e.g. product detail)
 * get a plain full-width layout so they match the rest of the site.
 */
export default function PublicWebLayout() {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const isAuthScreen = AUTH_PATHS.includes(pathname);

  // Login uses router.push (not replace), so Back can land a logged-in user
  // back on one of these forms — send them straight to home instead.
  if (isAuthenticated && LOGIN_FORM_PATHS.includes(pathname)) {
    return <Redirect href="/(customer)/home" />;
  }

  // Keep the Stack in a fixed tree position (same wrapper) to avoid remounts.
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#f8f7f5',
        alignItems: isAuthScreen ? 'center' : 'stretch',
        justifyContent: isAuthScreen ? 'center' : 'flex-start',
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: isAuthScreen ? 480 : undefined,
          flex: 1,
          backgroundColor: '#fff',
          ...(isAuthScreen ? {
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 32,
            shadowOffset: { width: 0, height: 4 },
            overflow: 'hidden' as any,
          } : {}),
        }}
      >
        <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
      </View>
    </View>
  );
}
