import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import {
  getPromoCampaigns, getCampaignRecipients, getDeliverySummary, pushErrorLabel,
  CampaignSummary, CampaignRecipient, PushStatus,
} from '@/services/campaignService';
import { checkPushReceipts } from '@/services/pushNotificationService';
import { formatDateTime } from '@/utils/formatDate';
import { COLORS } from '@/lib/theme';
import { AdminHeader, AdminButton, AdminChip, StatusPill } from '@/components/admin/AdminUI';

// Delivery wording, shared by the summary, campaign cards and the recipients list.
const STATUS_INFO: Record<PushStatus | 'untracked', { label: string; tone: 'green' | 'muted' | 'danger' | 'brand' }> = {
  delivered: { label: 'وصل',            tone: 'green' },
  sent:      { label: 'بانتظار التأكيد', tone: 'brand' },
  failed:    { label: 'فشل',            tone: 'danger' },
  no_token:  { label: 'بدون جهاز',       tone: 'muted' },
  untracked: { label: 'قبل التتبع',      tone: 'muted' },
};

function Stat({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 17, fontWeight: '700', color }}>{value}</Text>
      <Text style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

// ─── All notifications, last 7 days ──────────────────────────────────────────
function DeliveryCard() {
  const { data, isLoading } = useQuery({ queryKey: ['push-delivery', 7], queryFn: () => getDeliverySummary(7) });
  if (isLoading || !data) return null;
  const { counts, failures, total } = data;
  const tracked = total - counts.untracked;
  const rate = tracked > 0 ? Math.round((counts.delivered / tracked) * 100) : 0;

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12, marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.ink }}>وصول كل الإشعارات · آخر 7 أيام</Text>
          <Text style={{ fontSize: 12, color: COLORS.muted }}>طلبات، توفّر منتجات وعروض — {total} إشعار</Text>
        </View>
        {tracked > 0 && <Text style={{ fontSize: 20, fontWeight: '700', color: rate >= 80 ? COLORS.green : COLORS.brandText }}>{rate}%</Text>}
      </View>
      <View style={{ flexDirection: 'row' }}>
        <Stat value={counts.delivered} label="وصل" color={COLORS.green} />
        <Stat value={counts.sent} label="بانتظار التأكيد" color={COLORS.brandText} />
        <Stat value={counts.failed} label="فشل" color={COLORS.danger} />
        <Stat value={counts.no_token} label="بدون جهاز" color={COLORS.muted} />
      </View>
      {failures.length > 0 && (
        <View style={{ gap: 6, borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 10 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.muted }}>أسباب الفشل</Text>
          {failures.slice(0, 4).map((f) => (
            <View key={f.error} style={{ flexDirection: 'row', gap: 8 }}>
              <Text style={{ flex: 1, fontSize: 12, color: COLORS.ink }}>{pushErrorLabel(f.error)}</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.danger }}>{f.count}</Text>
            </View>
          ))}
        </View>
      )}
      {counts.untracked > 0 && (
        <Text style={{ fontSize: 11, color: COLORS.faint }}>
          {counts.untracked} إشعار بدون حالة: أُرسلت قبل بدء التتبع أو من الخادم مباشرة (طلب جديد للمشرفين، تعديل طلب).
        </Text>
      )}
    </View>
  );
}

// ─── Campaign card ────────────────────────────────────────────────────────────
function CampaignCard({ campaign, onPress }: { campaign: CampaignSummary; onPress: () => void }) {
  const openRate = campaign.sent_count > 0 ? Math.round((campaign.read_count / campaign.sent_count) * 100) : 0;
  const tracked = campaign.untracked_count < campaign.sent_count;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, gap: 12 }}>
      <View style={{ gap: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.ink }} numberOfLines={1}>{campaign.title_ar}</Text>
        <Text style={{ fontSize: 12, color: COLORS.muted }} numberOfLines={1}>{campaign.body_ar}</Text>
        <Text style={{ fontSize: 11, color: COLORS.faint }}>{formatDateTime(campaign.sent_at)}</Text>
      </View>

      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 12 }}>
        <Stat value={campaign.sent_count} label="المستلمون" color={COLORS.ink} />
        {tracked ? (
          <>
            <Stat value={campaign.delivered_count} label="وصل" color={COLORS.green} />
            <Stat value={campaign.failed_count} label="فشل" color={COLORS.danger} />
            <Stat value={campaign.no_token_count} label="بدون جهاز" color={COLORS.muted} />
          </>
        ) : (
          <Stat value="—" label="الوصول (قبل التتبع)" color={COLORS.faint} />
        )}
        <Stat value={`${campaign.read_count} · ${openRate}%`} label="فتح" color={COLORS.brandText} />
      </View>
      {campaign.pending_count > 0 && (
        <Text style={{ fontSize: 11, color: COLORS.brandText }}>{campaign.pending_count} بانتظار تأكيد الوصول من Apple/Google</Text>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 12, color: COLORS.brandText, fontWeight: '700' }}>تفاصيل المستلمين</Text>
        <Ionicons name="chevron-back" size={14} color={COLORS.brandText} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Recipients of one campaign ───────────────────────────────────────────────
type RecipientFilter = 'all' | 'opened' | PushStatus | 'untracked';

function RecipientsModal({ campaign, onClose }: { campaign: CampaignSummary | null; onClose: () => void }) {
  const [filter, setFilter] = useState<RecipientFilter>('all');
  const { data: recipients = [], isLoading } = useQuery({
    queryKey: ['campaign-recipients', campaign?.campaign_id],
    queryFn: () => getCampaignRecipients(campaign!.campaign_id),
    enabled: !!campaign?.campaign_id,
  });

  const test = (r: CampaignRecipient, f: RecipientFilter) =>
    f === 'all' ? true : f === 'opened' ? !!r.read_at : f === 'untracked' ? !r.push_status : r.push_status === f;
  const chips: Array<{ key: RecipientFilter; label: string }> = [
    { key: 'all', label: 'الكل' },
    { key: 'opened', label: 'فتح' },
    { key: 'delivered', label: STATUS_INFO.delivered.label },
    { key: 'sent', label: STATUS_INFO.sent.label },
    { key: 'failed', label: STATUS_INFO.failed.label },
    { key: 'no_token', label: STATUS_INFO.no_token.label },
    { key: 'untracked', label: STATUS_INFO.untracked.label },
  ];
  const visible = useMemo(() => recipients.filter((r) => test(r, filter)), [recipients, filter]);

  return (
    <Modal visible={!!campaign} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface, direction: 'rtl' as any }}>
        <View style={{ backgroundColor: '#fff', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.line }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity onPress={onClose} accessibilityLabel="إغلاق" style={{ width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={20} color={COLORS.ink} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.ink }} numberOfLines={1}>{campaign?.title_ar}</Text>
              <Text style={{ fontSize: 12, color: COLORS.muted }}>{visible.length} من {recipients.length}</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {chips.map((c) => {
              const count = recipients.filter((r) => test(r, c.key)).length;
              if (count === 0 && c.key !== 'all' && filter !== c.key) return null;
              return <AdminChip key={c.key} label={c.label} count={count} active={filter === c.key} onPress={() => setFilter(c.key)} />;
            })}
          </ScrollView>
        </View>

        {isLoading ? (
          <ActivityIndicator color={COLORS.brand} size="large" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(item) => item.user_id}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            ListEmptyComponent={<Text style={{ textAlign: 'center', color: COLORS.muted, marginTop: 40 }}>لا يوجد مستلمون هنا</Text>}
            renderItem={({ item }) => {
              const info = STATUS_INFO[item.push_status ?? 'untracked'];
              return (
                <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 12, gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.ink }} numberOfLines={1}>{item.full_name ?? item.email}</Text>
                      <Text style={{ fontSize: 12, color: COLORS.muted }} numberOfLines={1}>{item.phone ?? item.email}</Text>
                    </View>
                    <StatusPill label={info.label} tone={info.tone} />
                    {item.read_at && <StatusPill label="فتح" tone="brand" />}
                  </View>
                  {item.push_status === 'failed' && (
                    <Text style={{ fontSize: 12, color: COLORS.danger }}>{pushErrorLabel(item.push_error)}</Text>
                  )}
                  {item.read_at && <Text style={{ fontSize: 11, color: COLORS.faint }}>فتح في {formatDateTime(item.read_at)}</Text>}
                </View>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function NotificationStatsScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<CampaignSummary | null>(null);

  // Fetch Expo receipts first, so "sent" pushes show as delivered / failed.
  const { data: campaigns = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['promo-campaigns'],
    queryFn: async () => {
      await checkPushReceipts().catch(() => 0);
      return getPromoCampaigns();
    },
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface, direction: 'rtl' as any }}>
      <AdminHeader
        title="إحصائيات الإشعارات"
        subtitle={`${campaigns.length} حملة ترويجية`}
        actions={<AdminButton icon="refresh-outline" accessibilityLabel="تحديث" loading={isFetching} onPress={() => refetch()} />}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <DeliveryCard />

        <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.muted, marginBottom: 8 }}>الحملات الترويجية</Text>
        {isLoading ? (
          <ActivityIndicator color={COLORS.brand} size="large" style={{ marginTop: 30 }} />
        ) : campaigns.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 50, gap: 12 }}>
            <Ionicons name="megaphone-outline" size={44} color={COLORS.faint} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.ink }}>لا توجد حملات بعد</Text>
            <AdminButton primary label="إرسال أول إشعار" icon="send-outline" onPress={() => router.push('/(admin)/send-notification' as any)} />
          </View>
        ) : (
          campaigns.map((c) => <CampaignCard key={c.campaign_id} campaign={c} onPress={() => setSelected(c)} />)
        )}

        <Text style={{ fontSize: 11, color: COLORS.faint, marginTop: 8, lineHeight: 17 }}>
          "وصل" = سلّمته Apple أو Google لجهاز العميل. "بدون جهاز" = العميل لم يفعّل الإشعارات أو يستخدم الموقع فقط.
          "فتح" = فتح الإشعار داخل التطبيق.
        </Text>
      </ScrollView>

      <RecipientsModal campaign={selected} onClose={() => setSelected(null)} />
    </SafeAreaView>
  );
}
