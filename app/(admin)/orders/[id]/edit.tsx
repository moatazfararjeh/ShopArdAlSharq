import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOrder, useAdminUpdateOrderItems } from '@/hooks/useOrders';
import { useProductsPage } from '@/hooks/useProducts';
import { getCurrentLocale } from '@/i18n';
import { getProductName, Product } from '@/types/models';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { formatPrice } from '@/utils/formatPrice';

const C = {
  bg: '#f0f4f8',
  card: '#ffffff',
  brand: '#e36523',
  text: '#1e293b',
  muted: '#64748b',
  header: '#0d1b2a',
  hairline: '#e2e8f0',
};

const EDITABLE_STATUSES = ['pending', 'confirmed'];

interface Line {
  product_id: string;
  name: string;
  unit_price: number;
  quantity: number;
}

function friendlyError(message: string): string {
  const stock = message.match(/INSUFFICIENT_STOCK:(.*)\|(\d+)/);
  if (stock) {
    return `لا توجد كمية كافية من ${stock[1].trim()} في المخزون. المتوفر حالياً: ${stock[2]}. لم يتم حفظ أي تغيير.`;
  }
  if (message.includes('PRODUCT_UNAVAILABLE')) return 'أحد المنتجات غير متوفر للبيع.';
  if (message.includes('ORDER_NOT_EDITABLE')) return 'لا يمكن تعديل الطلب بعد بدء التحضير.';
  if (message.includes('EMPTY_ORDER')) return 'لازم يبقى منتج واحد على الأقل في الطلب.';
  if (message.includes('FORBIDDEN')) return 'ليس لديك صلاحية تعديل الطلبات.';
  return message;
}

export default function EditOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const locale = getCurrentLocale() as 'ar' | 'en';
  const { data: order, isLoading } = useOrder(id ?? '');
  const { data: productsPage } = useProductsPage({ availableOnly: true, limit: 2000 });
  const update = useAdminUpdateOrderItems();
  const { confirm, dialog } = useConfirm();

  const [lines, setLines] = useState<Line[] | null>(null);
  const [search, setSearch] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!order || lines) return;
    setLines(
      (order.items ?? [])
        .filter((i) => i.product_id)
        .map((i) => ({
          product_id: i.product_id!,
          name: i.product_name_ar,
          unit_price: i.unit_price,
          quantity: i.quantity,
        })),
    );
  }, [order, lines]);

  const originalQty = useMemo(
    () => new Map((order?.items ?? []).filter((i) => i.product_id).map((i) => [i.product_id!, i.quantity])),
    [order],
  );

  const hasChanges = !!lines && (
    lines.length !== originalQty.size ||
    lines.some((l) => originalQty.get(l.product_id) !== l.quantity)
  );

  const total = (lines ?? []).reduce((sum, l) => sum + l.unit_price * l.quantity, 0);

  const candidates = useMemo<Product[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q || !lines) return [];
    const inOrder = new Set(lines.map((l) => l.product_id));
    return (productsPage?.data ?? [])
      .filter((p) => !inOrder.has(p.id) && getProductName(p, locale).toLowerCase().includes(q))
      .slice(0, 15);
  }, [search, lines, productsPage, locale]);

  function addProduct(p: Product) {
    setLines((prev) => [
      ...(prev ?? []),
      { product_id: p.id, name: getProductName(p, locale), unit_price: p.discount_price ?? p.price, quantity: 1 },
    ]);
    setSearch('');
  }

  function setQuantity(productId: string, quantity: number) {
    setLines((prev) => (prev ?? []).map((l) => (l.product_id === productId ? { ...l, quantity: Math.max(1, quantity) } : l)));
  }

  function removeLine(productId: string) {
    setLines((prev) => (prev ?? []).filter((l) => l.product_id !== productId));
  }

  async function save() {
    if (!order || !lines || !hasChanges) return;
    if (lines.length === 0) {
      setError('لازم يبقى منتج واحد على الأقل في الطلب.');
      return;
    }
    const ok = await confirm({
      title: 'حفظ التعديلات',
      message: 'سيتم حفظ التعديلات على الطلب، وإرسال إشعار للعميل بالتغييرات. متابعة؟',
      confirmText: 'حفظ وإرسال',
    });
    if (!ok) return;

    setError(null);
    try {
      await update.mutateAsync({
        orderId: order.id,
        items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
        note: note.trim() || null,
      });
      router.back();
    } catch (e) {
      setError(friendlyError((e as Error).message));
    }
  }

  if (isLoading || !lines) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.brand} />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.muted, fontSize: 16 }}>الطلب غير موجود</Text>
      </SafeAreaView>
    );
  }

  const editable = EDITABLE_STATUSES.includes(order.status);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <View style={{ backgroundColor: C.header, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' }}>تعديل الطلب #{order.order_number}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        {!editable && (
          <View style={{ backgroundColor: '#fef2f2', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#fecaca' }}>
            <Text style={{ fontSize: 13, color: '#dc2626', textAlign: 'right' }}>
              لا يمكن تعديل الطلب بعد بدء التحضير.
            </Text>
          </View>
        )}

        {error && (
          <View style={{ backgroundColor: '#fef2f2', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#fecaca' }}>
            <Text style={{ fontSize: 13, color: '#dc2626', textAlign: 'right' }}>{error}</Text>
          </View>
        )}

        <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: C.text, textAlign: 'right' }}>المنتجات</Text>
          {lines.map((l) => (
            <View key={l.product_id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: C.hairline, paddingVertical: 8 }}>
              <TouchableOpacity onPress={() => removeLine(l.product_id)} disabled={!editable}>
                <Ionicons name="trash-outline" size={18} color={editable ? '#dc2626' : C.muted} />
              </TouchableOpacity>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: C.text, textAlign: 'right' }} numberOfLines={2}>{l.name}</Text>
                <Text style={{ fontSize: 11, color: C.muted, textAlign: 'right' }}>{formatPrice(l.unit_price)} للوحدة</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setQuantity(l.product_id, l.quantity - 1)}
                  disabled={!editable || l.quantity <= 1}
                  style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', opacity: !editable || l.quantity <= 1 ? 0.4 : 1 }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '800', color: C.brand }}>−</Text>
                </TouchableOpacity>
                <Text style={{ minWidth: 28, textAlign: 'center', fontSize: 14, fontWeight: '800', color: C.text }}>{l.quantity}</Text>
                <TouchableOpacity
                  onPress={() => setQuantity(l.product_id, l.quantity + 1)}
                  disabled={!editable}
                  style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center', opacity: editable ? 1 : 0.4 }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {editable && (
          <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: C.text, textAlign: 'right' }}>إضافة منتج</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="ابحث باسم المنتج..."
              placeholderTextColor={C.muted}
              style={{ borderWidth: 1, borderColor: C.hairline, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.text, textAlign: 'right' }}
            />
            {candidates.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => addProduct(p)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.hairline }}
              >
                <Ionicons name="add-circle-outline" size={18} color={C.brand} />
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 13, color: C.text, textAlign: 'right' }} numberOfLines={2}>{getProductName(p, locale)}</Text>
                  <Text style={{ fontSize: 11, color: C.muted }}>{formatPrice(p.discount_price ?? p.price)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: C.text, textAlign: 'right' }}>ملاحظة للعميل (اختياري)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            editable={editable}
            multiline
            placeholder="مثال: الصنف X غير متوفر حالياً، تم استبداله بـ..."
            placeholderTextColor={C.muted}
            style={{ borderWidth: 1, borderColor: C.hairline, borderRadius: 10, padding: 12, minHeight: 80, fontSize: 14, color: C.text, textAlign: 'right', textAlignVertical: 'top' }}
          />
        </View>

        <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: C.text }}>{formatPrice(total)}</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.muted }}>الإجمالي الجديد</Text>
        </View>

        <TouchableOpacity
          onPress={save}
          disabled={!editable || !hasChanges || update.isPending}
          style={{
            backgroundColor: !editable || !hasChanges || update.isPending ? '#e2e8f0' : '#16a34a',
            borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
          }}
        >
          {update.isPending && <ActivityIndicator size="small" color="#94a3b8" />}
          <Text style={{ color: !editable || !hasChanges || update.isPending ? '#94a3b8' : '#fff', fontWeight: '800', fontSize: 15 }}>
            {update.isPending ? 'جاري الحفظ...' : 'حفظ وإرسال للعميل'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      {dialog}
    </SafeAreaView>
  );
}
