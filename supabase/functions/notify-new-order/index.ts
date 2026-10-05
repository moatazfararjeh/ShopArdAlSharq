// Supabase Edge Function — notify-new-order
// Called by the database trigger after an order is placed (see migration 047).
// Sends the WhatsApp confirmation to the customer and an alert to every admin.
//
// Required secrets (supabase secrets set KEY=value):
//   NOTIFY_SECRET              — shared with the database (app.notify_secret)
//   WHATSAPP_PHONE_NUMBER_ID
//   WHATSAPP_ACCESS_TOKEN
//
// Deploy without JWT verification, because the database calls it without a user session:
//   npx supabase functions deploy notify-new-order --no-verify-jwt

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-()]/g, '').replace(/^00/, '+');
}

async function sendWhatsApp(to: string, message: string): Promise<void> {
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  if (!phoneNumberId || !accessToken) throw new Error('WhatsApp credentials not configured');

  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizePhone(to),
      type: 'text',
      text: { preview_url: false, body: message },
    }),
  });
  if (!res.ok) throw new Error(`WhatsApp API ${res.status}: ${await res.text()}`);
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const secret = Deno.env.get('NOTIFY_SECRET');
  if (!secret || req.headers.get('x-notify-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { orderId } = (await req.json()) as { orderId?: string };
  if (!orderId) {
    return new Response(JSON.stringify({ error: 'orderId is required' }), { status: 400, headers: JSON_HEADERS });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_number, total_amount, user_id')
    .eq('id', orderId)
    .single();
  if (orderError || !order) {
    return new Response(JSON.stringify({ error: 'order not found' }), { status: 404, headers: JSON_HEADERS });
  }

  const { data: customer } = await supabase
    .from('profiles')
    .select('phone')
    .eq('id', order.user_id)
    .single();

  const { data: admins } = await supabase
    .from('profiles')
    .select('phone')
    .in('role', ['admin', 'super_admin']);

  const total = Number(order.total_amount).toFixed(2);

  const customerMessage =
    `✅ *تم استلام طلبك #${order.order_number}*\n\n` +
    `شكراً لك! تم استلام طلبك بقيمة *${total} د.أ* بنجاح.\n` +
    `سيتم مراجعة طلبك وتأكيده في أقرب وقت.\n\n` +
    `شكراً لتسوقك معنا 🛒`;

  const adminMessage =
    `🛒 *طلب جديد يتطلب إجراءك #${order.order_number}*\n\n` +
    `📦 قيمة الطلب: *${total} د.أ*\n` +
    `🔖 رقم الطلب: ${order.order_number}\n\n` +
    `يرجى فتح لوحة الإدارة ومراجعة الطلب.`;

  const adminPhones = [...new Set(
    (admins ?? []).map((a: { phone: string | null }) => a.phone).filter((p): p is string => !!p),
  )];

  const jobs: Promise<void>[] = [];
  if (customer?.phone) jobs.push(sendWhatsApp(customer.phone, customerMessage));
  for (const phone of adminPhones) jobs.push(sendWhatsApp(phone, adminMessage));

  const results = await Promise.allSettled(jobs);
  const failures = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => String(r.reason));
  if (failures.length) console.error('[notify-new-order] failures:', failures);

  return new Response(
    JSON.stringify({ sent: results.length - failures.length, failed: failures.length }),
    { status: 200, headers: JSON_HEADERS },
  );
});
