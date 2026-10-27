import { createElement, useMemo, useState } from 'react';
import { View, Text, ScrollView, Switch, Platform, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProductsPage } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { buildCatalogHtml, groupCatalogSections } from '@/lib/catalogPdf';
import { COLORS } from '@/lib/theme';
import { AdminHeader, AdminButton } from '@/components/admin/AdminUI';

// A4 at 96 dpi plus the preview's grey margins — the iframe is scaled down from this.
const PREVIEW_WIDTH = 794 + 40;
const A4_RATIO = 297 / 210;

// Opens the catalogue in a new tab, which brings up the print dialog ("Save as PDF").
function exportPdf(html: string) {
  if (Platform.OS !== 'web') {
    Alert.alert('تصدير PDF', 'هذه الميزة متاحة من لوحة التحكم على المتصفح');
    return;
  }
  const win = window.open('', '_blank');
  if (!win) { alert('يرجى السماح بالنوافذ المنبثقة لتصدير PDF'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
}

export default function AdminCatalogPdfScreen() {
  const { width } = useWindowDimensions();
  const [showPrices, setShowPrices] = useState(false);

  const { data, isLoading } = useProductsPage({ availableOnly: true, limit: 2000 });
  const { data: categories = [] } = useCategories(true);
  const sections = useMemo(
    () => groupCatalogSections(data?.data ?? [], categories),
    [data, categories],
  );
  const total = sections.reduce((n, s) => n + s.products.length, 0);
  const previewHtml = useMemo(() => buildCatalogHtml({ sections, showPrices }), [sections, showPrices]);

  const previewWidth = Math.min(width - 32, 520);
  const previewHeight = previewWidth * A4_RATIO;
  const scale = previewWidth / PREVIEW_WIDTH;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface }} edges={['top']}>
      <AdminHeader
        title="كتالوج PDF"
        subtitle="كل المنتجات المتاحة بتصميم فود بوكس"
        actions={
          <AdminButton
            primary
            icon="download-outline"
            label="تصدير PDF"
            loading={isLoading}
            onPress={() => exportPdf(buildCatalogHtml({ sections, showPrices, autoPrint: true }))}
          />
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.ink }}>إظهار الأسعار</Text>
              <Text style={{ fontSize: 12, color: COLORS.muted }}>سعر الوحدة الافتراضية بعد الخصم</Text>
            </View>
            <Switch
              value={showPrices}
              onValueChange={setShowPrices}
              trackColor={{ true: COLORS.brandFill, false: COLORS.line }}
              thumbColor="#fff"
            />
          </View>
          <Text style={{ fontSize: 13, color: COLORS.muted, lineHeight: 20 }}>
            {isLoading
              ? 'جاري تحميل المنتجات…'
              : `${total} منتج في ${sections.length} أقسام. على المتصفح اختر "حفظ كـ PDF" من نافذة الطباعة.`}
          </Text>
          {!isLoading && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {sections.map((s) => (
                <View key={s.name} style={{ backgroundColor: COLORS.brandTint, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.brandText }}>{s.name} · {s.products.length}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.brand} style={{ marginTop: 24 }} />
        ) : Platform.OS === 'web' && (
          // Scrollable, scaled-down preview of the whole document
          <View style={{ alignSelf: 'center', width: previewWidth, height: previewHeight, overflow: 'hidden', borderRadius: 12 }}>
            {createElement('iframe', {
              srcDoc: previewHtml,
              title: 'معاينة الكتالوج',
              style: {
                position: 'absolute', top: 0, left: 0, border: 0,
                width: PREVIEW_WIDTH, height: previewHeight / scale,
                transform: `scale(${scale})`, transformOrigin: 'top left',
              },
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
