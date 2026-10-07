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

// ─── Stock back-in-stock notifications ───────────────────────────────────────

export async function sendStockAvailableNotifications(
  productId: string,
  productName: string,
): Promise<number> {
  const { data: rows } = await (supabase as any)
    .from('stock_alerts')
    .select('user_id, profiles!inner(expo_push_token)')
    .eq('product_id', productId)
    .eq('is_notified', false);

  if (!rows || rows.length === 0) return 0;

  const EXPO_TOKEN_RE = /^ExponentPushToken\[.+\]$/;
  const titleAr = `✅ ${productName} أصبح متاحاً!`;
  const bodyAr  = 'المنتج الذي طلبت إشعاراً عنه أصبح متوفراً في المخزون.';

  // Batch insert in-app notifications
  const userIds: string[] = rows.map((r: any) => r.user_id);
  try {
    await (supabase as any).from('notifications').insert(
      userIds.map((uid) => ({
        user_id:  uid,
        title_ar: titleAr,
        title_en: `✅ ${productName} is now available!`,
        body_ar:  bodyAr,
        body_en:  'The product you requested a notification for is now in stock.',
        type:     'system',
        is_read:  false,
        data:     { productId },
      }))
    );
  } catch { /* best-effort */ }

  // Send push messages in batches of 100
  const messages: PushMessage[] = rows
    .filter((r: any) => {
      const token = r.profiles?.expo_push_token;
      return token && EXPO_TOKEN_RE.test(token);
    })
    .map((r: any) => ({
      to:    r.profiles.expo_push_token as string,
      title: titleAr,
      body:  bodyAr,
      sound: 'default' as const,
      data:  { productId },
    }));

  for (let i = 0; i < messages.length; i += 100) {
    await sendExpoPushNotification(messages.slice(i, i + 100));
  }

  // Mark alerts as notified
  await (supabase as any)
    .from('stock_alerts')
    .update({ is_notified: true, notified_at: new Date().toISOString() })
    .eq('product_id', productId)
    .in('user_id', userIds);

  return userIds.length;
}

// ─── Admin broadcast notification ────────────────────────────────────────────

export async function sendBroadcastNotification(
  titleAr: string,
  bodyAr: string,
): Promise<{ sentCount: number; campaignId: string }> {
  const { data: profiles } = await (supabase as any)
    .from('profiles')
    .select('id, expo_push_token');

  if (!profiles || profiles.length === 0) return { sentCount: 0, campaignId: '' };

  const EXPO_TOKEN_RE = /^ExponentPushToken\[.+\]$/;

  // Generate a campaign UUID to group all these notifications
  const campaignId = generateUUID();

  // Batch insert in-app notifications for all users
  try {
    await (supabase as any).from('notifications').insert(
      (profiles as Array<{ id: string }>).map((p) => ({
        user_id:     p.id,
        title_ar:    titleAr,
        title_en:    titleAr,
        body_ar:     bodyAr,
        body_en:     bodyAr,
        type:        'promo',
        is_read:     false,
        campaign_id: campaignId,
        data:        {},
      }))
    );
  } catch { /* best-effort */ }

  const messages: PushMessage[] = (profiles as Array<{ id: string; expo_push_token: string | null }>)
    .filter((p) => p.expo_push_token && EXPO_TOKEN_RE.test(p.expo_push_token))
    .map((p) => ({
      to:    p.expo_push_token as string,
      title: titleAr,
      body:  bodyAr,
      sound: 'default' as const,
    }));

  for (let i = 0; i < messages.length; i += 100) {
    await sendExpoPushNotification(messages.slice(i, i + 100));
  }

  return { sentCount: profiles.length, campaignId };
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ─── Order status notification ────────────────────────────────────────────────

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
  // Validate token format — Expo push tokens must match ExponentPushToken[...]
  // This prevents forwarding arbitrary strings stored by a user to the Expo push API.
  const EXPO_TOKEN_RE = /^ExponentPushToken\[.+\]$/;
  if (!token || !EXPO_TOKEN_RE.test(token)) return;

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
