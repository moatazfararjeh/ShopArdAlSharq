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

const EXPO_TOKEN_RE = /^ExponentPushToken\[.+\]$/;

/** Expo's answer for one message: accepted (with a ticket id) or refused. */
type PushTicket = { status: 'ok'; id: string } | { status: 'error'; message?: string; details?: { error?: string } };

/** Sends a batch (≤100) and returns one ticket per message, in order. Never throws. */
async function sendExpoPushNotification(messages: PushMessage[]): Promise<PushTicket[]> {
  if (messages.length === 0) return [];
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    const json = await res.json().catch(() => null);
    const tickets: PushTicket[] | undefined = json?.data;
    if (Array.isArray(tickets) && tickets.length === messages.length) return tickets;
    const reason = json?.errors?.[0]?.code ?? `HTTP ${res.status}`;
    return messages.map(() => ({ status: 'error', message: reason, details: { error: reason } }));
  } catch {
    // Best-effort — don't crash the app if push delivery fails
    return messages.map(() => ({ status: 'error', message: 'NetworkError', details: { error: 'NetworkError' } }));
  }
}

/** One notification row to push: its id, and the customer's token (null = none). */
interface PushTarget {
  notificationId: string;
  token: string | null | undefined;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Send the pushes for these notification rows through the database
 * (send_push_notifications, migration 062), which records each one as
 * no_token / sent / failed. Expo's API has no CORS headers, so a browser can't
 * call it — the web admin's pushes only go out this way. Falls back to calling
 * Expo directly (works in the phone app, untracked) if the function is missing.
 */
async function deliverPushes(targets: PushTarget[]): Promise<void> {
  if (!targets.length) return;
  const ids = targets.map((t) => t.notificationId);
  let ok = true;
  for (let i = 0; i < ids.length; i += 500) {
    const { error } = await (supabase as any).rpc('send_push_notifications', { p_ids: ids.slice(i, i + 500) });
    if (error) { ok = false; break; }
  }
  if (ok) return;

  const withToken = targets.filter((t) => !!t.token && EXPO_TOKEN_RE.test(t.token));
  for (let i = 0; i < withToken.length; i += 100) {
    await sendExpoPushNotification(withToken.slice(i, i + 100).map((t) => ({
      to: t.token as string, title: t.title, body: t.body, sound: 'default' as const,
      data: { ...(t.data ?? {}), notificationId: t.notificationId },
    })));
  }
}

/**
 * Turn "sent" pushes into delivered / failed from Expo's receipts (kept about
 * a day), done by the database. Call when looking at the stats.
 */
export async function checkPushReceipts(): Promise<number> {
  const { data, error } = await (supabase as any).rpc('check_push_receipts');
  return error ? 0 : Number(data ?? 0);
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

  const titleAr = `✅ ${productName} أصبح متاحاً!`;
  const bodyAr  = 'المنتج الذي طلبت إشعاراً عنه أصبح متوفراً في المخزون.';

  // Batch insert in-app notifications (ids come back for delivery tracking)
  const userIds: string[] = rows.map((r: any) => r.user_id);
  let inserted: Array<{ id: string; user_id: string }> = [];
  try {
    const { data } = await (supabase as any).from('notifications').insert(
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
    ).select('id, user_id');
    inserted = data ?? [];
  } catch { /* best-effort */ }

  const tokenOf = new Map<string, string | null>(rows.map((r: any) => [r.user_id, r.profiles?.expo_push_token ?? null]));
  await deliverPushes(inserted.map((n) => ({
    notificationId: n.id, token: tokenOf.get(n.user_id), title: titleAr, body: bodyAr, data: { productId },
  })));

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

  // Generate a campaign UUID to group all these notifications
  const campaignId = generateUUID();

  // Batch insert in-app notifications for all users (ids come back for delivery tracking)
  let inserted: Array<{ id: string; user_id: string }> = [];
  try {
    const { data } = await (supabase as any).from('notifications').insert(
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
    ).select('id, user_id');
    inserted = data ?? [];
  } catch { /* best-effort */ }

  const tokenOf = new Map((profiles as Array<{ id: string; expo_push_token: string | null }>).map((p) => [p.id, p.expo_push_token]));
  await deliverPushes(inserted.map((n) => ({
    notificationId: n.id, token: tokenOf.get(n.user_id), title: titleAr, body: bodyAr,
  })));

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
  const notificationId = await insertNotification({
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

  // deliverPushes validates the token format (ExponentPushToken[...]) so
  // arbitrary strings stored by a user never reach the Expo push API.
  const token = (profile as { expo_push_token?: string | null } | null)?.expo_push_token;
  if (!notificationId) return;
  await deliverPushes([{ notificationId, token, title: titleAr, body: msg.bodyAr, data: { orderId } }]);
}
