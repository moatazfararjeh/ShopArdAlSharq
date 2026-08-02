import '../global.css';
import '../i18n';
import { useEffect } from 'react';
import { ErrorUtils, I18nManager, LogBox, Platform, Text, TextInput, View } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// ── Global JS error handler ────────────────────────────────────────────────
// In production, React Native's default handler calls RCTExceptionsManager
// .reportFatal → abort(), crashing the app (App Store 2.1a rejection).
// Overriding here logs the error and lets the native RCTSetFatalHandler +
// the React ErrorBoundary show a friendly screen instead of killing the process.
try {
  const _originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    console.error('[FoodBox] Unhandled JS error (isFatal=' + String(isFatal) + '):', error?.message, error?.stack);
    if (!isFatal) {
      _originalHandler?.(error, isFatal);
    }
    // Fatal errors: swallowed here — RCTSetFatalHandler (AppDelegate) prevents
    // abort(), and the React ErrorBoundary renders the error screen.
  });
} catch {
  // ErrorUtils not available on web
}

// ── Default font family + RTL for all Text / TextInput ─────────────────────
// Wrapped in try/catch: React 19 may throw when patching defaultProps on
// host components, especially during cold launch on iPadOS 26.
try {
  if ((Text as any).defaultProps == null) (Text as any).defaultProps = {};
  (Text as any).defaultProps.style = { fontFamily: 'NotoSansArabic-Regular' };
} catch { /* ignore */ }
try {
  if ((TextInput as any).defaultProps == null) (TextInput as any).defaultProps = {};
  (TextInput as any).defaultProps.style = { fontFamily: 'NotoSansArabic-Regular', textAlign: 'right', writingDirection: 'rtl' };
} catch { /* ignore */ }

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
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[FoodBox] ErrorBoundary caught:', error?.message);
    console.error('[FoodBox] Component stack:', info?.componentStack);
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

  // Start auth initialization in parallel with font loading.
  useAuth();

  useEffect(() => {
    I18nManager.forceRTL(true);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    }
  }, []);

  // Hide the splash screen as soon as fonts are ready.
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
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
