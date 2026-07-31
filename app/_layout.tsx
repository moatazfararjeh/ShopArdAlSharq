import '../global.css';
import '../i18n';
import { useEffect } from 'react';
import { I18nManager, LogBox, Platform, Text, TextInput, View } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// Set default font family + RTL rendering for all Text and TextInput components.
// Icons use their own fontFamily so they remain unaffected.
// writingDirection: 'rtl' — tells iOS/Android to shape bidirectional Unicode text RTL.
// textAlign: 'right'      — anchors every text block to the right by default.
// Components that need centering already set textAlign: 'center' explicitly.
if ((Text as any).defaultProps == null) (Text as any).defaultProps = {};
(Text as any).defaultProps.style = { fontFamily: 'NotoSansArabic-Regular' };
if ((TextInput as any).defaultProps == null) (TextInput as any).defaultProps = {};
(TextInput as any).defaultProps.style = { fontFamily: 'NotoSansArabic-Regular', textAlign: 'right', writingDirection: 'rtl' };

SplashScreen.preventAutoHideAsync();

// Suppress known third-party library warnings
LogBox.ignoreLogs([
  'props.pointerEvents is deprecated',
  '"shadow*" style props are deprecated',
  '[expo-notifications]',
]);

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const originalWarn = console.warn;
  const originalError = console.error;
  const SUPPRESSED = [
    'props.pointerEvents is deprecated',
    '"shadow*" style props are deprecated',
    '[expo-notifications]',
    'Listening to push token changes is not yet fully supported',
    'Invalid Refresh Token',
    'Refresh Token Not Found',
  ];
  console.warn = (...args: any[]) => {
    if (SUPPRESSED.some((s) => args[0]?.toString?.().includes?.(s))) return;
    originalWarn(...args);
  };
  console.error = (...args: any[]) => {
    if (SUPPRESSED.some((s) => args[0]?.toString?.().includes?.(s))) return;
    originalError(...args);
  };
}

// Force RTL at module level so React Native Web applies it before first render
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// Web: set dir="rtl" on the document root so CSS flexbox also respects RTL
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.setAttribute('dir', 'rtl');
  document.documentElement.setAttribute('lang', 'ar');
}
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useCartSync } from '@/hooks/useCart';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Toast } from '@/components/ui/Toast';
import React from 'react';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#dc2626', marginBottom: 12 }}>
            حدث خطأ غير متوقع
          </Text>
          <Text style={{ fontSize: 13, color: '#666', textAlign: 'center' }}>
            {this.state.error?.message}
          </Text>
          <Text style={{ fontSize: 11, color: '#999', textAlign: 'center', marginTop: 8 }}>
            {this.state.error?.stack?.slice(0, 500)}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function AuthInitializer() {
  useAuth();
  return null;
}

function CartInitializer() {
  useCartSync();
  return null;
}

function PushInitializer() {
  usePushNotifications();
  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'NotoSansArabic-Regular': require('../assets/fonts/NotoSansArabic-Regular.ttf'),
    'NotoSansArabic-SemiBold': require('../assets/fonts/NotoSansArabic-SemiBold.ttf'),
    'NotoSansArabic-Bold': require('../assets/fonts/NotoSansArabic-Bold.ttf'),
  });

  // Start auth initialization here so it runs in parallel with font loading.
  // useAuth() subscribes to the Zustand store and keeps the subscription alive
  // for the lifetime of the root layout (which never unmounts).
  const { isInitialized } = useAuth();

  useEffect(() => {
    I18nManager.forceRTL(true);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    }
  }, []);

  // Keep the native splash screen visible until BOTH fonts and auth are ready.
  // This avoids the custom loading-spinner flash: the user sees the splash screen
  // (which looks intentional) and then immediately the correct screen.
  useEffect(() => {
    if (fontsLoaded && isInitialized) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isInitialized]);

  if (!fontsLoaded || !isInitialized) {
    return null; // Splash screen remains visible while we wait
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {/* AuthInitializer removed — useAuth() above already handles initialisation */}
        <CartInitializer />
        <PushInitializer />
        <StatusBar style="auto" />
        <View style={{ flex: 1, direction: 'rtl' }}>
          <Stack screenOptions={{ headerShown: false }} />
        </View>
        <Toast />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

