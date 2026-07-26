import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

// Show notifications while the app is foregrounded
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch {
  // expo-notifications may not be fully available
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    // Android requires a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#e36523',
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '930260f4-2f52-4396-8533-c61ceb68bd72',
    });
    return tokenData.data;
  } catch {
    return null;
  }
}

async function savePushToken(userId: string, token: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('profiles') as any)
    .update({ expo_push_token: token })
    .eq('id', userId);
}

export function usePushNotifications() {
  const session = useAuthStore((s) => s.session);
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    const userId = session.user.id;

    // Register and save token
    registerForPushNotificationsAsync().then((token) => {
      if (token) savePushToken(userId, token);
    }).catch(() => {});

    try {
      // Listen for incoming notifications while app is open
      notificationListener.current = Notifications.addNotificationReceivedListener(
        (_notification) => {
          // Notification received — badge count is updated automatically
        },
      );

      // Handle tap on a notification
      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const data = response.notification.request.content.data as Record<string, unknown>;
          const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (typeof data?.orderId === 'string' && UUID_RE.test(data.orderId)) {
            router.push(`/(customer)/orders/${data.orderId}` as any);
          }
        },
      );
    } catch {
      // Notification listeners not available
    }

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [session?.user?.id]);
}
