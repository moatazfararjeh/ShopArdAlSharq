import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGlobalAnalyticsSummary,
  useTopProducts,
  useGlobalDailyStats,
} from '@/hooks/useAnalytics';
import { TopProductMetric } from '@/services/analyticsService';

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  view:        '#2563eb',
  add_to_cart: '#f59e0b',
  purchase:    '#10b981',
  wishlist:    '#ef4444',
  share:       '#8b5cf6',
  impression:  '#6b7280',
  abandoned:   '#dc2626',
  bg:          '#f9f7f5',
  card:        '#ffffff',
  border:      '#f3f4f6',
  text:        '#1c1917',
  muted:       '#9ca3af',
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon, label, value, color, sub,
}: {
  icon: string; label: string; value: string | number; color: string; sub?: string;
}) {
  return (
    <View style={{
      flex: 1, minWidth: '44%', margin: 4,
      backgroundColor: C.card, borderRadius: 16, padding: 14,
      borderLeftWidth: 3, borderLeftColor: color,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <View style={{
          width: 28, height: 28, borderRadius: 8,
          backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name={icon as any} size={14} color={color} />
        </View>
        <Text style={{ fontSize: 11, color: C.muted, flex: 1 }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 24, fontWeight: '900', color: C.text }}>{value}</Text>
      {sub && <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</Text>}
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: 10, paddingHorizontal: 4 }}>
      <Text style={{ fontSize: 15, fontWeight: '800', color: C.text }}>{title}</Text>
      {subtitle && <Text style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{subtitle}</Text>}
    </View>
  );
}

// ─── Funnel Bar ───────────────────────────────────────────────────────────────

function FunnelBar({
  label, emoji, value, max, color,
}: { label: string; emoji: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max((value / max) * 100, 2) : 2;
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 14 }}>{emoji}</Text>
          <Text style={{ fontSize: 12, color: C.text, fontWeight: '600' }}>{label}</Text>
        </View>
        <Text style={{ fontSize: 13, fontWeight: '800', color }}>
          {value.toLocaleString()}
        </Text>
      </View>
      <View style={{ height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: 4 }} />
      </View>
      {max > 0 && (
        <Text style={{ fontSize: 10, color: C.muted, textAlign: 'right', marginTop: 2 }}>
          {pct.toFixed(1)}%
        </Text>
      )}
    </View>
  );
}

// ─── Daily Bar Chart (text-based mini bars) ───────────────────────────────────

function DailyTrendChart({ data }: { data: ReturnType<typeof useGlobalDailyStats>['data'] }) {
  if (!data || data.length === 0) return null;

  const maxViews = Math.max(...data.map((d) => d.views), 1);

  return (
    <View>
      {/* Column headers */}
      <View style={{ flexDirection: 'row', marginBottom: 6, paddingHorizontal: 2 }}>
        <Text style={{ width: 46, fontSize: 10, color: C.muted }}>التاريخ</Text>
        <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
          {[
            { key: 'views',       color: C.view,        label: 'مشاهدة' },
            { key: 'add_to_cart', color: C.add_to_cart, label: 'سلة' },
            { key: 'purchases',   color: C.purchase,    label: 'شراء' },
          ].map((col) => (
            <Text key={col.key} style={{ flex: 1, fontSize: 9, color: col.color, textAlign: 'center', fontWeight: '700' }}>
              {col.label}
            </Text>
          ))}
        </View>
      </View>

      {data.map((day) => {
        const barW = maxViews > 0 ? (day.views / maxViews) * 100 : 0;
        return (
          <View key={day.date} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ width: 46, fontSize: 10, color: C.muted }}>{day.date.slice(5)}</Text>
            <View style={{ flex: 1, gap: 3 }}>
              {/* View bar */}
              <View style={{ height: 6, backgroundColor: '#e8f0fe', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${Math.max(barW, day.views > 0 ? 4 : 0)}%`, backgroundColor: C.view, borderRadius: 3 }} />
              </View>
              {/* Numbers row */}
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Text style={{ flex: 1, fontSize: 10, color: C.view, textAlign: 'center', fontWeight: '700' }}>
                  {day.views > 0 ? day.views : '—'}
                </Text>
                <Text style={{ flex: 1, fontSize: 10, color: C.add_to_cart, textAlign: 'center', fontWeight: '700' }}>
                  {day.add_to_cart > 0 ? day.add_to_cart : '—'}
                </Text>
                <Text style={{ flex: 1, fontSize: 10, color: C.purchase, textAlign: 'center', fontWeight: '700' }}>
                  {day.purchases > 0 ? day.purchases : '—'}
                </Text>
              </View>
            </View>
          </View>
        );
      })}

      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[
          { color: C.view,        label: '👁 مشاهدة' },
          { color: C.add_to_cart, label: '🛒 سلة' },
          { color: C.purchase,    label: '✅ شراء' },
          { color: C.wishlist,    label: '❤️ مفضلة' },
          { color: C.share,       label: '📤 مشاركة' },
        ].map((item) => (
          <Text key={item.label} style={{ fontSize: 10, color: item.color }}>{item.label}</Text>
        ))}
      </View>
    </View>
  );
}

// ─── Top Product Row ──────────────────────────────────────────────────────────

function TopProductRow({
  rank, name, count, imageUrl, metricLabel, color,
}: { rank: number; name: string; count: number; imageUrl?: string | null; metricLabel: string; color: string }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingVertical: 8,
      borderBottomWidth: 1, borderBottomColor: C.border,
    }}>
      {/* Rank */}
      <View style={{
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: rank <= 3 ? color + '20' : '#f3f4f6',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: rank <= 3 ? color : C.muted }}>{rank}</Text>
      </View>

      {/* Thumbnail */}
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#f3f4f6' }} />
      ) : (
        <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="cube-outline" size={16} color={C.muted} />
        </View>
      )}

      {/* Name */}
      <Text numberOfLines={2} style={{ flex: 1, fontSize: 13, fontWeight: '600', color: C.text }}>
        {name}
      </Text>

      {/* Count */}
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 16, fontWeight: '900', color }}>{count.toLocaleString()}</Text>
        <Text style={{ fontSize: 9, color: C.muted }}>{metricLabel}</Text>
      </View>
    </View>
  );
}

// ─── Top Products Panel ───────────────────────────────────────────────────────

const TOP_TABS: Array<{ metric: TopProductMetric; label: string; color: string; metricLabel: string }> = [
  { metric: 'views_count',       label: 'مشاهدة',   color: C.view,        metricLabel: 'مشاهدة' },
  { metric: 'add_to_cart_count', label: 'سلة',      color: C.add_to_cart, metricLabel: 'إضافة' },
  { metric: 'purchases_count',   label: 'شراء',     color: C.purchase,    metricLabel: 'طلب' },
  { metric: 'wishlist_count',    label: 'مفضلة',    color: C.wishlist,    metricLabel: 'إضافة' },
  { metric: 'abandoned_cart_users', label: 'أضاف ولم يشتري', color: C.abandoned, metricLabel: 'مستخدم' },
];

function TopProductsPanel() {
  const [activeTab, setActiveTab] = useState(0);
  const tab = TOP_TABS[activeTab];
  const { data, isLoading } = useTopProducts(tab.metric, 5);

  return (
    <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {TOP_TABS.map((t, i) => (
            <TouchableOpacity
              key={t.metric}
              onPress={() => setActiveTab(i)}
              style={{
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                backgroundColor: i === activeTab ? t.color : '#f3f4f6',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: i === activeTab ? '#fff' : C.muted }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator color={tab.color} style={{ marginVertical: 16 }} />
      ) : !data || data.length === 0 ? (
        <Text style={{ textAlign: 'center', color: C.muted, paddingVertical: 16, fontSize: 13 }}>
          لا توجد بيانات بعد
        </Text>
      ) : (
        data.map((product, i) => (
          <TopProductRow
            key={product.product_id}
            rank={i + 1}
            name={product.name_ar || product.name_en}
            count={product.count}
            imageUrl={product.image_url}
            metricLabel={tab.metricLabel}
            color={tab.color}
          />
        ))
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AnalyticsDashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: summary, isLoading: loadingSummary } = useGlobalAnalyticsSummary();
  const { data: dailyData, isLoading: loadingDaily } = useGlobalDailyStats(7);

  async function handleRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['analytics'] });
    setRefreshing(false);
  }

  const maxFunnel = summary?.total_views ?? 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* ── Header ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard' as any)} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={22} color={C.text} />
            </TouchableOpacity>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '900', color: C.text }}>لوحة التحليلات</Text>
              <Text style={{ fontSize: 11, color: C.muted }}>جميع المنتجات</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleRefresh}
            disabled={refreshing}
            style={{ backgroundColor: '#eff6ff', borderRadius: 10, padding: 10 }}
          >
            {refreshing
              ? <ActivityIndicator size="small" color={C.view} />
              : <Ionicons name="refresh-outline" size={18} color={C.view} />
            }
          </TouchableOpacity>
        </View>

        {/* ── KPI Cards ── */}
        {loadingSummary ? (
          <ActivityIndicator color={C.view} style={{ marginVertical: 24 }} />
        ) : (
          <>
            <SectionTitle title="إجمالي الأحداث" subtitle={`${summary?.products_tracked ?? 0} منتج يتم تتبعه`} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 16 }}>
              <KpiCard icon="eye-outline"         label="المشاهدات"     value={(summary?.total_views ?? 0).toLocaleString()}         color={C.view} />
              <KpiCard icon="cart-outline"        label="إضافة للسلة"   value={(summary?.total_add_to_cart ?? 0).toLocaleString()}    color={C.add_to_cart} />
              <KpiCard icon="bag-check-outline"   label="المشتريات"     value={(summary?.total_purchases ?? 0).toLocaleString()}      color={C.purchase} />
              <KpiCard icon="heart-outline"       label="المفضلة"       value={(summary?.total_wishlist ?? 0).toLocaleString()}       color={C.wishlist} />
              <KpiCard icon="share-social-outline" label="المشاركات"   value={(summary?.total_shares ?? 0).toLocaleString()}         color={C.share} />
              <KpiCard icon="person-remove-outline" label="أضاف ولم يشتري" value={(summary?.total_abandoned_cart_users ?? 0).toLocaleString()} color={C.abandoned}
                sub={`من أصل ${summary?.total_unique_cart_users ?? 0} أضافوا للسلة`}
              />
              <KpiCard icon="people-outline"     label="زوار فريدون"   value={(summary?.total_unique_viewers ?? 0).toLocaleString()}  color="#7c3aed" />
              <KpiCard icon="trending-up-outline" label="متوسط التحويل" value={`${summary?.avg_conversion_rate ?? 0}%`}               color="#059669"
                sub="من المشاهدة للشراء"
              />
            </View>

            {/* ── Conversion Funnel ── */}
            <SectionTitle title="قمع التحويل" subtitle="الانتقال من الظهور إلى الشراء" />
            <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
              {summary?.total_impressions !== undefined && summary.total_impressions > 0 && (
                <FunnelBar label="الظهور"     emoji="📋" value={summary.total_impressions} max={maxFunnel} color={C.impression} />
              )}
              <FunnelBar label="المشاهدات"   emoji="👁"  value={summary?.total_views ?? 0}        max={maxFunnel} color={C.view} />
              <FunnelBar label="إضافة للسلة" emoji="🛒"  value={summary?.total_add_to_cart ?? 0}  max={maxFunnel} color={C.add_to_cart} />
              <FunnelBar label="المفضلة"     emoji="❤️" value={summary?.total_wishlist ?? 0}      max={maxFunnel} color={C.wishlist} />
              <FunnelBar label="المشتريات"   emoji="✅"  value={summary?.total_purchases ?? 0}     max={maxFunnel} color={C.purchase} />
            </View>
          </>
        )}

        {/* ── 7-Day Trend ── */}
        <SectionTitle title="النشاط — آخر 7 أيام" />
        <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
          {loadingDaily
            ? <ActivityIndicator color={C.view} style={{ marginVertical: 16 }} />
            : <DailyTrendChart data={dailyData} />
          }
        </View>

        {/* ── Top Products ── */}
        <SectionTitle title="أفضل المنتجات" subtitle="اختر المقياس من التبويبات" />
        <TopProductsPanel />

      </ScrollView>
    </SafeAreaView>
  );
}
