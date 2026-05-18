import { View } from 'react-native';
import { Stack, usePathname } from 'expo-router';

const AUTH_PATHS = ['/', '/login', '/register', '/forgot-password'];

/**
 * On web, auth screens (login / register / forgot-password) are shown as a
 * centered card (max 480 px).  All other public pages (e.g. product detail)
 * get a plain full-width layout so they match the rest of the site.
 */
export default function PublicWebLayout() {
  const pathname = usePathname();
  const isAuthScreen = AUTH_PATHS.includes(pathname);

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
