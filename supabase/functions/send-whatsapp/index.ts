// Supabase Edge Function — send-whatsapp
// Calls Meta WhatsApp Cloud API to send a text message.
//
// Required Supabase secrets (set via: supabase secrets set KEY=value):
//   WHATSAPP_PHONE_NUMBER_ID   — your WhatsApp Business phone number ID
//   WHATSAPP_ACCESS_TOKEN      — permanent system-user token from Meta Business
//
// Deploy: npx supabase functions deploy send-whatsapp

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { to, message } = await req.json() as { to: string; message: string };

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, message' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    const accessToken   = Deno.env.get('WHATSAPP_ACCESS_TOKEN');

    if (!phoneNumberId || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'WhatsApp credentials not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Normalize phone: strip spaces/dashes, ensure + prefix
    const normalizedPhone = to.replace(/[\s\-()]/g, '').replace(/^00/, '+');

    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

    const body = {
      messaging_product: 'whatsapp',
      recipient_type:    'individual',
      to:                normalizedPhone,
      type:              'text',
      text: {
        preview_url: false,
        body:        message,
      },
    };

    const response = await fetch(url, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[send-whatsapp] API error:', JSON.stringify(result));
      return new Response(
        JSON.stringify({ error: result }),
        { status: response.status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result?.messages?.[0]?.id }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[send-whatsapp] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
