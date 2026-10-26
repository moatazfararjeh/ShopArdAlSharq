import { supabase } from '@/lib/supabase';

export interface CampaignSummary {
  campaign_id: string;
  title_ar: string;
  body_ar: string;
  sent_at: string;
  sent_count: number;
  read_count: number;
  /** Push delivery (062); all 0 before tracking started. */
  delivered_count: number;
  pending_count: number;
  failed_count: number;
  no_token_count: number;
  untracked_count: number;
}

export type PushStatus = 'no_token' | 'sent' | 'delivered' | 'failed';

/** One customer's copy of a campaign: delivery status and whether they opened it. */
export interface CampaignRecipient {
  user_id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  read_at: string | null;
  push_status: PushStatus | null;
  push_error: string | null;
}

/** Arabic explanation of Expo / Apple / Google push errors. */
export function pushErrorLabel(code: string | null | undefined): string {
  switch (code) {
    case 'DeviceNotRegistered': return 'التطبيق محذوف أو الإشعارات معطّلة (أُزيل الرمز)';
    case 'MessageRateExceeded': return 'إشعارات كثيرة لنفس الجهاز';
    case 'MessageTooBig':       return 'الإشعار أكبر من المسموح';
    case 'InvalidCredentials':  return 'إعدادات إرسال الإشعارات (Apple/Google) غير صحيحة';
    case 'NetworkError':        return 'تعذّر الاتصال بخادم الإشعارات';
    default:                    return code ? `خطأ: ${code}` : 'خطأ غير معروف';
  }
}

export interface CampaignReader {
  user_id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  read_at: string | null;
}

// ─── List all broadcast campaigns with stats ──────────────────────────────────

export async function getPromoCampaigns(): Promise<CampaignSummary[]> {
  const { data, error } = await (supabase as any)
    .from('promo_campaign_stats')
    .select('*')
    .order('sent_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    campaign_id: row.campaign_id,
    title_ar:    row.title_ar,
    body_ar:     row.body_ar,
    sent_at:     row.sent_at,
    sent_count:  Number(row.sent_count),
    read_count:  Number(row.read_count),
    delivered_count: Number(row.delivered_count ?? 0),
    pending_count:   Number(row.pending_count ?? 0),
    failed_count:    Number(row.failed_count ?? 0),
    no_token_count:  Number(row.no_token_count ?? 0),
    untracked_count: Number(row.untracked_count ?? row.sent_count),
  }));
}

// ─── Who opened a specific campaign ──────────────────────────────────────────

export async function getCampaignReaders(campaignId: string): Promise<CampaignReader[]> {
  const { data, error } = await (supabase as any)
    .from('notifications')
    .select('user_id, read_at, profiles!inner(full_name, email, phone)')
    .eq('campaign_id', campaignId)
    .eq('is_read', true)
    .order('read_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    user_id:   row.user_id,
    full_name: row.profiles?.full_name ?? null,
    email:     row.profiles?.email ?? '',
    phone:     row.profiles?.phone ?? null,
    read_at:   row.read_at ?? null,
  }));
}

// ─── Everyone a campaign went to, with delivery status ───────────────────────

export async function getCampaignRecipients(campaignId: string): Promise<CampaignRecipient[]> {
  const { data, error } = await (supabase as any)
    .from('notifications')
    .select('user_id, read_at, push_status, push_error, profiles!inner(full_name, email, phone)')
    .eq('campaign_id', campaignId)
    .order('read_at', { ascending: false, nullsFirst: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    user_id:     row.user_id,
    full_name:   row.profiles?.full_name ?? null,
    email:       row.profiles?.email ?? '',
    phone:       row.profiles?.phone ?? null,
    read_at:     row.read_at ?? null,
    push_status: row.push_status ?? null,
    push_error:  row.push_error ?? null,
  }));
}

// ─── Delivery of every notification (orders, stock alerts, offers) ───────────

export interface DeliverySummary {
  total: number;
  counts: Record<PushStatus | 'untracked', number>;
  /** Failure reasons, most common first. */
  failures: Array<{ error: string; count: number }>;
}

export async function getDeliverySummary(days: number): Promise<DeliverySummary> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await (supabase as any)
    .from('notifications')
    .select('push_status, push_error')
    .gte('created_at', since)
    .limit(20000);
  if (error) throw new Error(error.message);

  const counts: DeliverySummary['counts'] = { no_token: 0, sent: 0, delivered: 0, failed: 0, untracked: 0 };
  const fail = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ push_status: PushStatus | null; push_error: string | null }>) {
    counts[row.push_status ?? 'untracked'] += 1;
    if (row.push_status === 'failed') fail.set(row.push_error ?? '', (fail.get(row.push_error ?? '') ?? 0) + 1);
  }
  return {
    total: data?.length ?? 0,
    counts,
    failures: [...fail].map(([e, count]) => ({ error: e, count })).sort((a, b) => b.count - a.count),
  };
}
