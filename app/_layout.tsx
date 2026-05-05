import '../global.css';
import '../i18n';
import { useEffect } from 'react';
import { I18nManager } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useCartSync } from '@/hooks/useCart';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Toast } from '@/components/ui/Toast';

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
  useEffect(() => {
    // App is Arabic-only — always enforce RTL
    if (!I18nManager.isRTL) {
      I18nManager.forceRTL(true);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer />
      <CartInitializer />
      <PushInitializer />
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
      <Toast />
    </QueryClientProvider>
  );
}

