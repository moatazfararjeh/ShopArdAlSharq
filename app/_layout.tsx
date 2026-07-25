import '../global.css';
import '../i18n';
import { useEffect } from 'react';
import { I18nManager, LogBox, Platform, Text, TextInput, View } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// Set default font family for all Text and TextInput components
// Icons override this with their own fontFamily, so they remain unaffected
if ((Text as any).defaultProps == null) (Text as any).defaultProps = {};
(Text as any).defaultProps.style = { fontFamily: 'NotoSansArabic-Regular' };
if ((TextInput as any).defaultProps == null) (TextInput as any).defaultProps = {};
(TextInput as any).defaultProps.style = { fontFamily: 'NotoSansArabic-Regular' };

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

  useEffect(() => {
    I18nManager.forceRTL(true);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      const timer = setTimeout(() => {
        SplashScreen.hideAsync();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthInitializer />
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

