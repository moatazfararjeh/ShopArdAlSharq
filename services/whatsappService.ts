import { supabase } from '@/lib/supabase';

/**
 * Sends a WhatsApp message via the Supabase Edge Function.
 * Best-effort — never throws, never blocks the caller.
 *
 * @param to      Recipient phone number (e.g. "+962791234567" or "0791234567")
 * @param message Plain-text message body
 */
async function sendWhatsApp(to: string, message: string): Promise<void> {
  if (!to) return;
  try {
    await supabase.functions.invoke('send-whatsapp', {
      body: { to, message },
    });
  } catch {
    // Best-effort — WhatsApp failure must never crash the app
  }
}

// ─── Customer: order status update ───────────────────────────────────────────

const ORDER_STATUS_WHATSAPP: Partial<Record<string, string>> = {
  confirmed:  '✅ *تم تأكيد طلبك!*\nطلبك قيد المعالجة الآن.',
  preparing:  '👨‍🍳 *طلبك يُحضَّر الآن*\nفريقنا يحضّر طلبك بعناية.',
  shipped:    '🚚 *طلبك في الطريق إليك!*\nطلبك خرج للتوصيل.',
  delivered:  '📦 *تم تسليم طلبك!*\nنأمل أن تكون راضياً. شكراً لك!',
  cancelled:  '❌ *تم إلغاء الطلب*\nللمزيد من التفاصيل راجع تفاصيل الطلب.',
};

export async function sendOrderStatusWhatsApp(
  phone: string,
  orderNumber: string,
  status: string,
): Promise<void> {
  const statusMsg = ORDER_STATUS_WHATSAPP[status];
  if (!statusMsg) return;
  const message = `${statusMsg}\n\n*طلب رقم:* #${orderNumber}`;
  await sendWhatsApp(phone, message);
}
