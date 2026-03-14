import { supabase } from '@/lib/supabase';
import { OrderStatus, NotificationType } from '@/types/database.types';
import { insertNotification } from '@/services/notificationService';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
}

async function sendExpoPushNotification(messages: PushMessage[]) {
  if (messages.length === 0) return;
  try {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch {
    // Best-effort — don't crash the app if push delivery fails
  }
}

const ORDER_STATUS_MESSAGES: Partial<Record<OrderStatus, { titleAr: string; titleEn: string; bodyAr: string; bodyEn: string; type: NotificationType }>> = {
  confirmed:  { titleAr: '✅ تم تأكيد طلبك',         titleEn: '✅ Order Confirmed',          bodyAr: 'طلبك قيد المعالجة الآن.',                    bodyEn: 'Your order is being processed.',               type: 'order_confirmed' },
  preparing:  { titleAr: '👨‍🍳 طلبك يُحضَّر الآن',    titleEn: '👨‍🍳 Order Being Prepared',    bodyAr: 'فريقنا يحضّر طلبك بعناية.',                  bodyEn: 'Our team is carefully preparing your order.',  type: 'order_preparing' },
  shipped:    { titleAr: '🚚 طلبك في الطريق إليك',    titleEn: '🚚 Order Shipped',             bodyAr: 'طلبك خرج للتوصيل.',                          bodyEn: 'Your order is on the way.',                   type: 'order_shipped'   },
  delivered:  { titleAr: '📦 تم تسليم طلبك',          titleEn: '📦 Order Delivered',           bodyAr: 'نأمل أن تكون راضياً عن طلبك. شكراً لك!',    bodyEn: 'We hope you enjoy your order. Thank you!',    type: 'order_delivered' },
  cancelled:  { titleAr: '❌ تم إلغاء الطلب',          titleEn: '❌ Order Cancelled',           bodyAr: 'للمزيد من التفاصيل راجع تفاصيل الطلب.',     bodyEn: 'See order details for more information.',     type: 'order_cancelled' },
};

/**
 * Saves a notification row to the DB and sends a push notification (best-effort).
 */
export async function sendOrderStatusNotification(
  orderId: string,
  orderNumber: string | number,
  userId: string,
  newStatus: OrderStatus,
) {
  const msg = ORDER_STATUS_MESSAGES[newStatus];
  if (!msg) return;

  const titleAr = `${msg.titleAr} #${orderNumber}`;
  const titleEn = `${msg.titleEn} #${orderNumber}`;

  // 1. Always save to notifications table (visible in-app)
  await insertNotification({
    userId,
    titleAr,
    titleEn,
    bodyAr: msg.bodyAr,
    bodyEn: msg.bodyEn,
    type: msg.type,
    data: { orderId },
  });

  // 2. Try to send push notification (only works on real devices)
  const { data: profile } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .eq('id', userId)
    .single();

  const token = (profile as { expo_push_token?: string | null } | null)?.expo_push_token;
  if (!token) return;

  await sendExpoPushNotification([
    {
      to: token,
      title: titleAr,
      body: msg.bodyAr,
      sound: 'default',
      data: { orderId },
    },
  ]);
}
