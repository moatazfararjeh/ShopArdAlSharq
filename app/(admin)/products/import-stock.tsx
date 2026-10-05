import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useQueryClient } from '@tanstack/react-query';
import { useProductsPage } from '@/hooks/useProducts';
import {
  parseErpStockFile,
  buildImportPlan,
  applyImportPlan,
  type ImportPlan,
  type PlanItem,
  type PlanStatus,
  type ApplyResult,
} from '@/services/erpStockImport';

const C = {
  bg: '#f0f4f8',
  card: '#ffffff',
  brand: '#e36523',
  text: '#1e293b',
  muted: '#64748b',
  header: '#0d1b2a',
  hairline: '#e2e8f0',
};

const STATUS_LABEL: Record<PlanStatus, string> = {
  ready: 'جاهز للتحديث',
  unchanged: 'بدون تغيير',
  not_linked: 'غير مربوط بمنتج',
  unit_mismatch: 'عدم تطابق الوحدة',
  no_unit_type: 'بدون نوع وحدة',
  duplicate: 'مكرر في الملف',
  fractional: 'رصيد كسري',
};

const STATUS_ORDER: PlanStatus[] = ['unit_mismatch', 'duplicate', 'fractional', 'no_unit_type', 'not_linked', 'unchanged'];

function confirmAsync(message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
  return new Promise((resolve) => {
    Alert.alert('تأكيد', message, [
      { text: 'إلغاء', style: 'cancel', onPress: () => resolve(false) },
      { text: 'تحديث', onPress: () => resolve(true) },
    ]);
  });
}

export default function ImportStockScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading: productsLoading } = useProductsPage({ availableOnly: false, page: 0, limit: 9999 });
  const products = data?.data ?? [];

  const [fileName, setFileName] = useState<string | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const buffer = file
        ? await file.arrayBuffer()
        : await (await fetch(asset.uri)).arrayBuffer();
      const rows = await parseErpStockFile(buffer);
      setPlan(buildImportPlan(rows, products));
      setFileName(asset.name);
    } catch (e) {
      setPlan(null);
      setError((e as Error).message);
    } finally {
      setParsing(false);
    }
  }

  async function apply() {
    if (!plan) return;
    const readyCount = plan.items.filter((i) => i.status === 'ready').length;
    const ok = await confirmAsync(`سيتم تحديث ${readyCount} منتج بالكميات من الملف. متابعة؟`);
    if (!ok) return;

    setApplying(true);
    setProgress({ done: 0, total: readyCount });
    setError(null);
    try {
      const res = await applyImportPlan(plan.items, (done, total) => setProgress({ done, total }));
      setResult(res);
      setPlan(null);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setApplying(false);
    }
  }

  const counts = (plan?.items ?? []).reduce<Record<PlanStatus, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] ?? 0) + 1;
    return acc;
  }, {} as Record<PlanStatus, number>);
  const readyItems = plan?.items.filter((i) => i.status === 'ready') ?? [];
  const reviewItems = plan
    ? STATUS_ORDER.flatMap((s) => plan.items.filter((i) => i.status === s))
    : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <View style={{ backgroundColor: C.header, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' }}>استيراد أرصدة ERP</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 10 }}>
          <Text style={{ fontSize: 13, color: C.muted, textAlign: 'right', lineHeight: 20 }}>
            يتم تحديث الكميات حسب نوع وحدة كل منتج: منتج بالكرتون ياخذ عدد الكراتين، ومنتج بالحبة أو بالكيلو ياخذ الرصيد بنفس الوحدة. المطابقة تتم عبر كود ERP المسجّل على المنتج.
          </Text>
          <TouchableOpacity
            onPress={pickFile}
            disabled={parsing || applying || productsLoading}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              backgroundColor: parsing || applying || productsLoading ? '#e2e8f0' : C.brand,
              borderRadius: 12, paddingVertical: 13,
            }}
          >
            {parsing || productsLoading ? (
              <ActivityIndicator size="small" color="#94a3b8" />
            ) : (
              <Ionicons name="document-attach-outline" size={18} color="#fff" />
            )}
            <Text style={{ color: parsing || applying || productsLoading ? '#94a3b8' : '#fff', fontWeight: '800', fontSize: 14 }}>
              {productsLoading ? 'جاري تحميل المنتجات...' : parsing ? 'جاري قراءة الملف...' : 'اختيار ملف الأرصدة (.xlsx)'}
            </Text>
          </TouchableOpacity>
          {fileName && <Text style={{ fontSize: 12, color: C.muted, textAlign: 'right' }}>الملف: {fileName}</Text>}
        </View>

        {error && (
          <View style={{ backgroundColor: '#fef2f2', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#fecaca' }}>
            <Text style={{ fontSize: 13, color: '#dc2626', textAlign: 'right' }}>{error}</Text>
          </View>
        )}

        {plan && (
          <>
            <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: C.text, textAlign: 'right' }}>ملخص المعاينة</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(Object.keys(STATUS_LABEL) as PlanStatus[]).map((s) => (
                  <View key={s} style={{
                    minWidth: 130, flexGrow: 1, borderRadius: 12, padding: 10,
                    backgroundColor: s === 'ready' ? '#f0fdf4' : '#f8fafc',
                    borderWidth: 1, borderColor: s === 'ready' ? '#bbf7d0' : C.hairline,
                  }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: s === 'ready' ? '#16a34a' : C.text, textAlign: 'right' }}>{counts[s] ?? 0}</Text>
                    <Text style={{ fontSize: 11, color: C.muted, textAlign: 'right' }}>{STATUS_LABEL[s]}</Text>
                  </View>
                ))}
                <View style={{ minWidth: 130, flexGrow: 1, borderRadius: 12, padding: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: C.hairline }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: C.text, textAlign: 'right' }}>{plan.missingFromFile.length}</Text>
                  <Text style={{ fontSize: 11, color: C.muted, textAlign: 'right' }}>منتجات مربوطة وغير موجودة بالملف</Text>
                </View>
              </View>
            </View>

            {readyItems.length > 0 && (
              <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: C.text, textAlign: 'right', marginBottom: 6 }}>
                  سيتم تحديثها ({readyItems.length})
                </Text>
                {readyItems.map((item, idx) => (
                  <PlanRow key={`${item.erpCode}-${idx}`} item={item} />
                ))}
              </View>
            )}

            {reviewItems.length > 0 && (
              <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: C.text, textAlign: 'right', marginBottom: 6 }}>
                  للمراجعة (لن تُحدَّث)
                </Text>
                {reviewItems.map((item, idx) => (
                  <PlanRow key={`${item.erpCode}-${idx}`} item={item} />
                ))}
              </View>
            )}

            {plan.missingFromFile.length > 0 && (
              <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: C.text, textAlign: 'right', marginBottom: 6 }}>
                  منتجات مربوطة لكن غير موجودة في الملف (لن تتغير)
                </Text>
                {plan.missingFromFile.map((p) => (
                  <Text key={p.id} style={{ fontSize: 12, color: C.muted, textAlign: 'right', paddingVertical: 3 }}>
                    {p.name_ar} — {p.erp_code}
                  </Text>
                ))}
              </View>
            )}

            <TouchableOpacity
              onPress={apply}
              disabled={applying || readyItems.length === 0}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                backgroundColor: applying || readyItems.length === 0 ? '#e2e8f0' : '#16a34a',
                borderRadius: 16, paddingVertical: 16,
              }}
            >
              {applying ? (
                <ActivityIndicator size="small" color="#94a3b8" />
              ) : (
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              )}
              <Text style={{ color: applying || readyItems.length === 0 ? '#94a3b8' : '#fff', fontWeight: '800', fontSize: 15 }}>
                موافقة وبدء التحديث ({readyItems.length})
              </Text>
            </TouchableOpacity>
          </>
        )}

        {applying && (
          <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 13, color: C.muted }}>جاري التحديث {progress.done} / {progress.total}</Text>
          </View>
        )}

        {result && (
          <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#16a34a', textAlign: 'right' }}>
              تم تحديث {result.updated} منتج
            </Text>
            {result.conflicts.length > 0 && (
              <>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#b45309', textAlign: 'right' }}>
                  تغيّر رصيدها أثناء الاستيراد ولم تُحدَّث ({result.conflicts.length}). أعد الاستيراد لتحديثها.
                </Text>
                {result.conflicts.map((item, idx) => <PlanRow key={`${item.erpCode}-${idx}`} item={item} />)}
              </>
            )}
            {result.failed.length > 0 && (
              <>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#dc2626', textAlign: 'right' }}>
                  فشل ({result.failed.length})
                </Text>
                {result.failed.map(({ item, message }, idx) => (
                  <Text key={`${item.erpCode}-${idx}`} style={{ fontSize: 12, color: '#dc2626', textAlign: 'right' }}>
                    {item.productName ?? item.erpCode}: {message}
                  </Text>
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanRow({ item }: { item: PlanItem }) {
  const isReady = item.status === 'ready';
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: C.hairline, paddingVertical: 8, gap: 2 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: C.text, textAlign: 'right' }} numberOfLines={2}>
        {item.productName ?? item.erpName}
      </Text>
      <Text style={{ fontSize: 11, color: C.muted, textAlign: 'right' }}>
        كود ERP: {item.erpCode}{item.productName ? ` — ${item.erpName}` : ''}
      </Text>
      {isReady ? (
        <Text style={{ fontSize: 12, fontWeight: '700', color: C.brand, textAlign: 'right' }}>
          {item.before} ← {item.after}
        </Text>
      ) : (
        <Text style={{ fontSize: 12, color: '#b45309', textAlign: 'right' }}>
          {STATUS_LABEL[item.status]}{item.reason ? ` — ${item.reason}` : ''}
        </Text>
      )}
    </View>
  );
}
