import { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useQueryClient } from '@tanstack/react-query';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useProductsPage } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useSections } from '@/hooks/useSections';
import { useBrands } from '@/hooks/useBrands';
import {
  exportProductsExcel,
  parseProductsFile,
  buildPlan,
  applyPlan,
  type PlanRow,
  type RowStatus,
  type ApplyResult,
} from '@/services/productExcel';

const C = {
  bg: '#f0f4f8',
  card: '#ffffff',
  brand: '#e36523',
  text: '#1e293b',
  muted: '#64748b',
  header: '#0d1b2a',
  hairline: '#e2e8f0',
};

const STATUS_LABEL: Record<RowStatus, string> = {
  ready: 'جاهز للتحديث',
  unchanged: 'بدون تغيير',
  error: 'أخطاء يجب تصحيحها',
  not_found: 'رقم منتج غير موجود',
  new: 'صفوف جديدة (لا تُضاف)',
};

export default function ProductsExcelScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm, dialog } = useConfirm();

  // Everything, including hidden products and inactive lists, so names match
  const { data: productsPage, isLoading: productsLoading } = useProductsPage({ availableOnly: false, page: 0, limit: 9999 });
  const { data: categories = [], isLoading: catsLoading } = useCategories(false);
  const { data: sections = [], isLoading: secLoading } = useSections(false);
  const { data: brands = [], isLoading: brandsLoading } = useBrands(false);
  const products = productsPage?.data ?? [];
  const loading = productsLoading || catsLoading || secLoading || brandsLoading;

  const [exporting, setExporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanRow[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Partial<Record<RowStatus, number>> = {};
    plan?.forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [plan]);
  const readyRows = plan?.filter((r) => r.status === 'ready') ?? [];
  const problemRows = plan?.filter((r) => r.status === 'error' || r.status === 'not_found' || r.status === 'new') ?? [];

  async function doExport() {
    setError(null);
    setExporting(true);
    try {
      await exportProductsExcel(products, sections, categories, brands);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  async function pickFile() {
    setError(null);
    setResult(null);
    const picked = await DocumentPicker.getDocumentAsync({
      type: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.length) return;

    const asset = picked.assets[0];
    setParsing(true);
    try {
      const file = (asset as any).file as File | undefined;
      const buffer = file ? await file.arrayBuffer() : await (await fetch(asset.uri)).arrayBuffer();
      const rows = await parseProductsFile(buffer);
      setPlan(buildPlan(rows, products, categories, sections, brands));
      setFileName(asset.name);
    } catch (e) {
      setPlan(null);
      setError((e as Error).message);
    } finally {
      setParsing(false);
    }
  }

  async function apply() {
    if (!plan || !readyRows.length) return;
    const ok = await confirm({
      title: 'تحديث المنتجات',
      message: `سيتم تحديث ${readyRows.length} منتج حسب الملف. الصفوف التي فيها أخطاء لن تُعدَّل. متابعة؟`,
      confirmText: 'تحديث',
    });
    if (!ok) return;

    setApplying(true);
    setProgress({ done: 0, total: readyRows.length });
    setError(null);
    try {
      const res = await applyPlan(plan, (done, total) => setProgress({ done, total }));
      setResult(res);
      setPlan(null);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setApplying(false);
    }
  }

  const busy = loading || parsing || applying || exporting;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      {dialog}
      <View style={{ backgroundColor: C.header, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard' as any))}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' }}>المنتجات عبر Excel</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        {Platform.OS !== 'web' && (
          <View style={{ backgroundColor: '#fffbeb', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#fde68a' }}>
            <Text style={{ fontSize: 13, color: '#92400e', textAlign: 'right', lineHeight: 20 }}>
              تنزيل ملف Excel متاح من لوحة التحكم على الموقع (المتصفح). الرفع يعمل هنا وعلى الموقع.
            </Text>
          </View>
        )}

        {/* Step 1 — export */}
        <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 10 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: C.text, textAlign: 'right' }}>1. تنزيل قالب المنتجات</Text>
          <Text style={{ fontSize: 13, color: C.muted, textAlign: 'right', lineHeight: 20 }}>
            ملف فيه كل المنتجات ({loading ? '…' : products.length}) مع الاسم والفئة والقسم والماركة والسعر والكمية، وورقة "القوائم" بالأسماء الصحيحة.
            أرسله للعميل ليعبّئه، ثم ارفعه في الخطوة 2.
          </Text>
          <TouchableOpacity
            onPress={doExport}
            disabled={busy || Platform.OS !== 'web'}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              backgroundColor: busy || Platform.OS !== 'web' ? '#e2e8f0' : '#16a34a',
              borderRadius: 12, paddingVertical: 13,
            }}
          >
            {exporting || loading ? <ActivityIndicator size="small" color="#94a3b8" /> : <Ionicons name="download-outline" size={18} color="#fff" />}
            <Text style={{ color: busy || Platform.OS !== 'web' ? '#94a3b8' : '#fff', fontWeight: '800', fontSize: 14 }}>
              {loading ? 'جاري تحميل المنتجات...' : 'تنزيل ملف Excel'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Step 2 — import */}
        <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 10 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: C.text, textAlign: 'right' }}>2. رفع الملف بعد التعبئة</Text>
          <Text style={{ fontSize: 13, color: C.muted, textAlign: 'right', lineHeight: 20 }}>
            ستظهر معاينة بكل التغييرات قبل الحفظ. يتم المطابقة عبر "رقم المنتج"، ولا يتغيّر إلا ما تم تعديله في الملف.
          </Text>
          <TouchableOpacity
            onPress={pickFile}
            disabled={busy}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              backgroundColor: busy ? '#e2e8f0' : C.brand,
              borderRadius: 12, paddingVertical: 13,
            }}
          >
            {parsing ? <ActivityIndicator size="small" color="#94a3b8" /> : <Ionicons name="cloud-upload-outline" size={18} color="#fff" />}
            <Text style={{ color: busy ? '#94a3b8' : '#fff', fontWeight: '800', fontSize: 14 }}>
              {parsing ? 'جاري قراءة الملف...' : 'اختيار الملف (.xlsx)'}
            </Text>
          </TouchableOpacity>
          {fileName && <Text style={{ fontSize: 12, color: C.muted, textAlign: 'right' }}>الملف: {fileName}</Text>}
        </View>

        {error && (
          <View style={{ backgroundColor: '#fef2f2', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#fecaca' }}>
            <Text style={{ fontSize: 13, color: '#dc2626', textAlign: 'right' }}>{error}</Text>
          </View>
        )}

        {result && (
          <View style={{ backgroundColor: '#f0fdf4', borderRadius: 16, padding: 16, gap: 6, borderWidth: 1, borderColor: '#bbf7d0' }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#16a34a', textAlign: 'right' }}>تم تحديث {result.updated} منتج</Text>
            {result.failed.map((f) => (
              <Text key={f.rowNumber} style={{ fontSize: 12, color: '#dc2626', textAlign: 'right' }}>
                صف {f.rowNumber} — {f.name}: {f.message}
              </Text>
            ))}
          </View>
        )}

        {plan && (
          <>
            {/* Summary */}
            <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: C.text, textAlign: 'right' }}>ملخص المعاينة</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(Object.keys(STATUS_LABEL) as RowStatus[]).map((s) => (
                  <View key={s} style={{
                    minWidth: 130, flexGrow: 1, borderRadius: 12, padding: 10,
                    backgroundColor: s === 'ready' ? '#f0fdf4' : s === 'error' ? '#fef2f2' : '#f8fafc',
                    borderWidth: 1, borderColor: s === 'ready' ? '#bbf7d0' : s === 'error' ? '#fecaca' : C.hairline,
                  }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: s === 'ready' ? '#16a34a' : s === 'error' ? '#dc2626' : C.text, textAlign: 'right' }}>
                      {counts[s] ?? 0}
                    </Text>
                    <Text style={{ fontSize: 11, color: C.muted, textAlign: 'right' }}>{STATUS_LABEL[s]}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                onPress={apply}
                disabled={!readyRows.length || applying}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  backgroundColor: !readyRows.length || applying ? '#e2e8f0' : C.brand,
                  borderRadius: 12, paddingVertical: 13, marginTop: 4,
                }}
              >
                {applying ? <ActivityIndicator size="small" color="#94a3b8" /> : <Ionicons name="checkmark-done-outline" size={18} color="#fff" />}
                <Text style={{ color: !readyRows.length || applying ? '#94a3b8' : '#fff', fontWeight: '800', fontSize: 14 }}>
                  {applying ? `جاري التحديث ${progress.done}/${progress.total}` : `تطبيق التغييرات (${readyRows.length})`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Problems first — they need fixing in the file */}
            {problemRows.length > 0 && (
              <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#dc2626', textAlign: 'right' }}>
                  صفوف لن تُحدَّث ({problemRows.length})
                </Text>
                {problemRows.slice(0, 200).map((r) => (
                  <View key={`${r.rowNumber}-${r.productId}`} style={{ borderTopWidth: 1, borderTopColor: C.hairline, paddingTop: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: C.text, textAlign: 'right' }}>
                      صف {r.rowNumber} — {r.name || '(بدون اسم)'}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#dc2626', textAlign: 'right' }}>{r.reason}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Changes that will be applied */}
            {readyRows.length > 0 && (
              <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: C.text, textAlign: 'right' }}>
                  التغييرات ({readyRows.length})
                </Text>
                {readyRows.slice(0, 300).map((r) => (
                  <View key={r.productId!} style={{ borderTopWidth: 1, borderTopColor: C.hairline, paddingTop: 8, gap: 2 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: C.text, textAlign: 'right' }}>{r.name}</Text>
                    {r.changes.map((c) => (
                      <Text key={c} style={{ fontSize: 12, color: C.muted, textAlign: 'right' }}>{c}</Text>
                    ))}
                  </View>
                ))}
                {readyRows.length > 300 && (
                  <Text style={{ fontSize: 12, color: C.muted, textAlign: 'right' }}>…و{readyRows.length - 300} منتج آخر</Text>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
