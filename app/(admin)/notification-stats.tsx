import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPromoCampaigns, getCampaignReaders, CampaignSummary, CampaignReader } from '@/services/campaignService';
import { formatDateTime } from '@/utils/formatDate';

const BRAND = '#e36523';

// ─── Open-rate ring ───────────────────────────────────────────────────────────
function OpenRateBadge({ sent, read }: { sent: number; read: number }) {
  const pct = sent > 0 ? Math.round((read / sent) * 100) : 0;
  const color = pct >= 50 ? '#16a34a' : pct >= 20 ? '#d97706' : '#dc2626';
  return (
    <View style={{
      width: 52, height: 52, borderRadius: 26,
      borderWidth: 3, borderColor: color,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#fff',
    }}>
      <Text style={{ fontSize: 14, fontWeight: '900', color }}>{pct}%</Text>
    </View>
  );
}

// ─── Campaign card ────────────────────────────────────────────────────────────
function CampaignCard({ campaign, onPress }: { campaign: CampaignSummary; onPress: () => void }) {
  const openRate = campaign.sent_count > 0
    ? Math.round((campaign.read_count / campaign.sent_count) * 100)
    : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12,
        shadowColor: '#1c1917', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <OpenRateBadge sent={campaign.sent_count} read={campaign.read_count} />

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#1c1917', textAlign: 'right' }} numberOfLines={1}>
            {campaign.title_ar}
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2, textAlign: 'right' }} numberOfLines={1}>
            {campaign.body_ar}
          </Text>
          <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, textAlign: 'right' }}>
            {formatDateTime(campaign.sent_at)}
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={{
        flexDirection: 'row', gap: 0, marginTop: 14,
        borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12,
      }}>
        {[
          { label: 'أُرسل', value: campaign.sent_count, color: '#6b7280' },
          { label: 'فتح', value: campaign.read_count, color: '#2563eb' },
          { label: 'لم يفتح', value: campaign.sent_count - campaign.read_count, color: '#dc2626' },
          { label: 'معدل الفتح', value: `${openRate}%`, color: openRate >= 30 ? '#16a34a' : '#d97706' },
        ].map((stat, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: stat.color }}>{stat.value}</Text>
            <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10, gap: 4 }}>
        <Text style={{ fontSize: 12, color: BRAND, fontWeight: '700' }}>من فتح الإشعار؟</Text>
        <Text style={{ fontSize: 16, color: BRAND }}>←</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Readers modal ────────────────────────────────────────────────────────────
function ReadersModal({
  campaign,
  visible,
  onClose,
}: {
  campaign: CampaignSummary | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { data: readers = [], isLoading } = useQuery({
    queryKey: ['campaign-readers', campaign?.campaign_id],
    queryFn: () => getCampaignReaders(campaign!.campaign_id),
    enabled: !!campaign?.campaign_id && visible,
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f7f5' }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          padding: 16, backgroundColor: '#fff',
          borderBottomWidth: 1, borderBottomColor: '#f0ece8',
        }}>
          <TouchableOpacity
            onPress={onClose}
            style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 18, color: '#374151' }}>✕</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1c1917' }} numberOfLines={1}>
              {campaign?.title_ar}
            </Text>
            <Text style={{ fontSize: 12, color: '#6b7280' }}>
              فتح الإشعار: {readers.length} من {campaign?.sent_count ?? 0}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={BRAND} size="large" />
          </View>
        ) : readers.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Text style={{ fontSize: 40 }}>📭</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1c1917' }}>لا أحد فتح الإشعار بعد</Text>
            <Text style={{ fontSize: 13, color: '#6b7280' }}>سيظهر هنا المستخدمون الذين يفتحون الإشعار</Text>
          </View>
        ) : (
          <FlatList
            data={readers}
            keyExtractor={(item) => item.user_id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }: { item: CampaignReader }) => (
              <View style={{
                backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
                flexDirection: 'row', alignItems: 'center', gap: 12,
                shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
              }}>
                {/* Avatar initial */}
                <View style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: '#fff0eb', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: BRAND }}>
                    {(item.full_name ?? item.email)[0].toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1c1917', textAlign: 'right' }}>
                    {item.full_name ?? item.email}
                  </Text>
                  {item.full_name ? (
                    <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'right' }}>{item.email}</Text>
                  ) : null}
                  {item.phone ? (
                    <Text style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right' }}>{item.phone}</Text>
                  ) : null}
                </View>

                {item.read_at ? (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 10, color: '#9ca3af' }}>فتح في</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#6b7280' }}>
                      {formatDateTime(item.read_at)}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function NotificationStatsScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<CampaignSummary | null>(null);

  const { data: campaigns = [], isLoading, refetch } = useQuery({
    queryKey: ['promo-campaigns'],
    queryFn: getPromoCampaigns,
  });

  const totalSent = campaigns.reduce((s, c) => s + c.sent_count, 0);
  const totalRead = campaigns.reduce((s, c) => s + c.read_count, 0);
  const avgOpen   = totalSent > 0 ? Math.round((totalRead / totalSent) * 100) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f7f5' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 20, color: '#374151' }}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#1c1917' }}>إحصائيات الإشعارات</Text>
            <Text style={{ fontSize: 12, color: '#9ca3af' }}>{campaigns.length} حملة ترويجية</Text>
          </View>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 18 }}>↻</Text>
          </TouchableOpacity>
        </View>

        {/* Summary KPIs */}
        {campaigns.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'إجمالي الإرسال', value: totalSent, color: '#2563eb', bg: '#eff6ff' },
              { label: 'إجمالي الفتح', value: totalRead, color: '#16a34a', bg: '#f0fdf4' },
              { label: 'متوسط الفتح', value: `${avgOpen}%`, color: '#d97706', bg: '#fffbeb' },
            ].map((k) => (
              <View key={k.label} style={{
                flex: 1, backgroundColor: k.bg, borderRadius: 16, padding: 14, alignItems: 'center',
              }}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: k.color }}>{k.value}</Text>
                <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 4, textAlign: 'center' }}>{k.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Campaign list */}
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator color={BRAND} size="large" />
          </View>
        ) : campaigns.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: 12 }}>
            <Text style={{ fontSize: 48 }}>📭</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1c1917' }}>لا توجد حملات بعد</Text>
            <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
              أرسل إشعارات ترويجية وستظهر إحصائياتها هنا
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(admin)/send-notification' as any)}
              style={{ backgroundColor: BRAND, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>إرسال أول إشعار 📢</Text>
            </TouchableOpacity>
          </View>
        ) : (
          campaigns.map((c) => (
            <CampaignCard key={c.campaign_id} campaign={c} onPress={() => setSelected(c)} />
          ))
        )}

      </ScrollView>

      <ReadersModal
        campaign={selected}
        visible={!!selected}
        onClose={() => setSelected(null)}
      />
    </SafeAreaView>
  );
}
