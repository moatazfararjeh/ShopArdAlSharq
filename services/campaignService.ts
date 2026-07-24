import { supabase } from '@/lib/supabase';

export interface CampaignSummary {
  campaign_id: string;
  title_ar: string;
  body_ar: string;
  sent_at: string;
  sent_count: number;
  read_count: number;
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
