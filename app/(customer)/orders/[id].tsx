import { View, Text, ScrollView, TouchableOpacity, Pressable, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOrder } from '@/hooks/useOrders';
import { formatPrice } from '@/utils/formatPrice';
import { formatDateTime } from '@/utils/formatDate';
import { getCurrentLocale } from '@/i18n';
import { getProductName, Order } from '@/types/models';
import { Skeleton } from '@/components/ui/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/lib/theme';
import { mapsUrl } from '@/components/address/LocationPicker';
import { Linking } from 'react-native';

const PLACEHOLDER_HASH = 'L9Q9mH00?bRi~WIUM{j[00t6xu%L';

function printOrderWindow(order: Order, locale: string) {
  const addr = (order.delivery_address ?? {}) as Record<string, string | null>;

  const statusLabelAr: Record<string, string> = {
    pending: 'قيد الانتظار', confirmed: 'تم التأكيد', preparing: 'جارٍ التحضير',
    shipped: 'طلبك في الطريق', delivered: 'تم التسليم', cancelled: 'ملغى',
  };

  const paymentMethodAr: Record<string, string> = {
    cash_on_delivery: 'الدفع عند الاستلام',
    bank_transfer: 'تحويل بنكي',
    credit_card: 'بطاقة ائتمان',
  };
  const paymentStatusAr: Record<string, string> = {
    paid: 'مدفوع', pending: 'قيد الانتظار', failed: 'فشل الدفع', refunded: 'مسترد',
  };

  const itemsHtml = (order.items ?? []).map((item) => {
    const prod = item.product;
    const name = prod
      ? (locale === 'ar' ? prod.name_ar : (prod.name_en ?? prod.name_ar))
      : (locale === 'ar' ? item.product_name_ar : (item.product_name_en ?? item.product_name_ar)) || '—';
    const imgUrl = (prod?.images?.[0] ?? prod?.product_images?.[0])?.url;
    const unitLabel = prod?.unit_type === 'carton' && prod.pieces_per_carton
      ? `كرتون (${prod.pieces_per_carton} حبة)`
      : prod?.unit_type === 'kg' ? 'كغ' : prod?.unit_type === 'tin' ? 'تنك' : 'حبة';
    const weightHtml = prod?.weight
      ? `<div class="item-weight">⚖️ ${prod.weight} ${prod.weight_unit ?? 'كغ'}</div>` : '';
    const imgHtml = imgUrl
      ? `<img src="${imgUrl}" class="item-img" />`
      : `<div class="item-img-placeholder">📦</div>`;
    return `
      <tr>
        <td class="item-img-cell">${imgHtml}</td>
        <td class="item-name-cell">
          <div class="item-name">${name}</div>
          ${weightHtml}
          <div class="item-unit">${unitLabel}</div>
        </td>
        <td class="item-qty">${item.quantity}</td>
        <td class="item-price">${formatPrice(item.unit_price)}</td>
        <td class="item-total">${formatPrice(item.total_price)}</td>
      </tr>`;
  }).join('');

  const addrBlock = Object.keys(addr).length > 0 ? `
    <div class="section">
      <div class="section-title">📍 عنوان التوصيل</div>
      <table class="info-table">
        ${addr.label ? `<tr><td class="info-lbl">التسمية</td><td>${addr.label}</td></tr>` : ''}
        ${addr.recipient_name ? `<tr><td class="info-lbl">المستلم</td><td>${addr.recipient_name}</td></tr>` : ''}
        ${addr.phone ? `<tr><td class="info-lbl">الهاتف</td><td>${addr.phone}</td></tr>` : ''}
        ${addr.city ? `<tr><td class="info-lbl">المدينة</td><td>${[addr.city, addr.district].filter(Boolean).join(' — ')}</td></tr>` : ''}
        ${addr.street ? `<tr><td class="info-lbl">الشارع</td><td>${addr.street}</td></tr>` : ''}
        ${(addr.building_number || addr.floor_number || addr.apartment_number) ? `<tr><td class="info-lbl">التفاصيل</td><td>${[addr.building_number ? `مبنى ${addr.building_number}` : null, addr.floor_number ? `طابق ${addr.floor_number}` : null, addr.apartment_number ? `شقة ${addr.apartment_number}` : null].filter(Boolean).join(' — ')}</td></tr>` : ''}
        ${addr.notes ? `<tr><td class="info-lbl">ملاحظات</td><td>${addr.notes}</td></tr>` : ''}
        ${addr.latitude != null && addr.longitude != null ? `<tr><td class="info-lbl">الموقع</td><td><a href="${mapsUrl(Number(addr.latitude), Number(addr.longitude))}">${Number(addr.latitude).toFixed(5)}, ${Number(addr.longitude).toFixed(5)}</a></td></tr>` : ''}
      </table>
    </div>` : '';

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>طلب #${order.order_number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #111827; direction: rtl; padding: 32px; font-size: 13px; }
    h1 { font-size: 22px; font-weight: 900; margin-bottom: 4px; }
    .meta { color: #9ca3af; font-size: 12px; margin-bottom: 24px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; background: #fff7ed; color: #ea580c; margin-right: 8px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 14px; font-weight: 800; margin-bottom: 10px; border-bottom: 2px solid #f3f4f6; padding-bottom: 6px; }
    .items-table { width: 100%; border-collapse: collapse; }
    .items-table th { background: #f9fafb; text-align: right; padding: 8px 10px; font-size: 12px; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
    .items-table td { padding: 10px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
    .item-img { width: 56px; height: 56px; border-radius: 10px; object-fit: cover; }
    .item-img-placeholder { width: 56px; height: 56px; border-radius: 10px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 24px; line-height: 56px; text-align: center; }
    .item-img-cell { width: 68px; }
    .item-name { font-weight: 700; margin-bottom: 3px; }
    .item-weight { font-size: 11px; color: #9ca3af; }
    .item-unit { display: inline-block; background: #fff7ed; color: #ea580c; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; margin-top: 4px; }
    .item-qty, .item-price { color: #6b7280; text-align: center; }
    .item-total { font-weight: 800; color: #e36523; text-align: left; }
    .totals-table { width: 100%; border-collapse: collapse; }
    .totals-table td { padding: 6px 10px; }
    .totals-table .total-row td { font-size: 16px; font-weight: 900; color: #e36523; border-top: 2px solid #f3f4f6; padding-top: 10px; }
    .totals-table .lbl { color: #6b7280; }
    .totals-table .val { text-align: left; font-weight: 600; }
    .info-table { width: 100%; border-collapse: collapse; }
    .info-table td { padding: 5px 8px; vertical-align: top; }
    .info-lbl { color: #9ca3af; width: 100px; font-size: 12px; }
    .footer { margin-top: 40px; text-align: center; color: #d1d5db; font-size: 11px; border-top: 1px solid #f3f4f6; padding-top: 16px; }
    @media print {
      body { padding: 16px; }
      @page { size: A4; margin: 16mm; }
    }
  </style>
</head>
<body>
  <h1>طلب #${order.order_number}</h1>
  <div class="meta">
    🗓 ${formatDateTime(order.created_at)}
    <span class="status-badge">${statusLabelAr[order.status] ?? order.status}</span>
  </div>

  <div class="section">
    <div class="section-title">المنتجات</div>
    <table class="items-table">
      <thead>
        <tr>
          <th></th>
          <th>المنتج</th>
          <th style="text-align:center">الكمية</th>
          <th style="text-align:center">سعر الوحدة</th>
          <th style="text-align:left">الإجمالي</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">الإجمالي</div>
    <table class="totals-table">
      ${order.delivery_fee > 0 ? `<tr><td class="lbl">رسوم التوصيل</td><td class="val">${formatPrice(order.delivery_fee)}</td></tr>` : ''}
      ${order.discount_amount > 0 ? `<tr><td class="lbl">الخصم</td><td class="val" style="color:#16a34a">- ${formatPrice(order.discount_amount)}</td></tr>` : ''}
      <tr class="total-row"><td class="lbl">المجموع الكلي</td><td class="val">${formatPrice(order.total_amount)}</td></tr>
    </table>
  </div>

  ${addrBlock}

  ${order.profile ? `
  <div class="section">
    <div class="section-title">👤 معلومات الحساب</div>
    <table class="info-table">
      ${order.profile.full_name ? `<tr><td class="info-lbl">الاسم</td><td>${order.profile.full_name}</td></tr>` : ''}
      ${order.profile.company_name ? `<tr><td class="info-lbl">الشركة</td><td>${order.profile.company_name}</td></tr>` : ''}
      ${order.profile.email ? `<tr><td class="info-lbl">البريد</td><td>${order.profile.email}</td></tr>` : ''}
      ${(() => { const p = order.profile?.phone ?? (order.delivery_address as Record<string, string | null>)?.phone; return p ? `<tr><td class="info-lbl">هاتف الشركة</td><td>${p}</td></tr>` : ''; })()}
    </table>
  </div>` : ''}

  <div class="section">
    <div class="section-title">💳 معلومات الدفع</div>
    <table class="info-table">
      <tr><td class="info-lbl">طريقة الدفع</td><td>${paymentMethodAr[order.payment_method] ?? order.payment_method}</td></tr>
      <tr><td class="info-lbl">حالة الدفع</td><td>${paymentStatusAr[order.payment_status] ?? order.payment_status}</td></tr>
      ${order.notes ? `<tr><td class="info-lbl">ملاحظات</td><td>${order.notes}</td></tr>` : ''}
    </table>
  </div>

  <div class="footer">ArdAlsharq — تم الطباعة من النظام</div>
</body>
</html>`;

  // Use a hidden iframe to print without navigating away from the page
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.left = '-9999px';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
    // Wait for content to render then print
    setTimeout(() => {
      iframe.contentWindow?.print();
      // Clean up after print dialog closes
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  }
}

// Ordered flow — cancelled is handled separately
const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'] as const;

const STATUS_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; labelAr: string; hint: string }> = {
  pending:   { icon: 'time-outline',             labelAr: 'قيد الانتظار',    hint: 'استلمنا طلبك وسنؤكده قريباً' },
  confirmed: { icon: 'checkmark-circle-outline', labelAr: 'تم التأكيد',      hint: 'تم تأكيد طلبك وسيبدأ تجهيزه' },
  preparing: { icon: 'cube-outline',             labelAr: 'جارٍ التحضير',    hint: 'نقوم بتجهيز منتجاتك الآن' },
  shipped:   { icon: 'car-outline',              labelAr: 'طلبك في الطريق',  hint: 'سيصلك السائق قريباً' },
  delivered: { icon: 'home-outline',             labelAr: 'تم التسليم',      hint: 'شكراً لطلبك من فود بوكس' },
  cancelled: { icon: 'close-circle-outline',     labelAr: 'ملغى',            hint: 'تم إلغاء هذا الطلب' },
};

const PAYMENT_METHOD_AR: Record<string, string> = {
  cash_on_delivery: 'الدفع عند الاستلام', bank_transfer: 'تحويل بنكي', credit_card: 'بطاقة ائتمان',
};
const PAYMENT_STATUS_AR: Record<string, string> = {
  paid: 'مدفوع', pending: 'قيد الانتظار', failed: 'فشل الدفع', refunded: 'مسترد',
};

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 12 }}>
      {!!title && <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.ink, marginBottom: 12 }}>{title}</Text>}
      {children}
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
      <Ionicons name={icon} size={16} color={COLORS.muted} style={{ marginTop: 1 }} />
      <Text style={{ fontSize: 13, color: COLORS.muted, width: 92 }}>{label}</Text>
      <Text style={{ fontSize: 13, color: COLORS.ink, fontWeight: '600', flex: 1 }}>{value}</Text>
    </View>
  );
}

function OrderTimeline({ status }: { status: string }) {
  if (status === 'cancelled') return null; // the status card already says it

  const currentIndex = STATUS_FLOW.indexOf(status as typeof STATUS_FLOW[number]);

  return (
    <Card title="حالة الطلب">
      {STATUS_FLOW.map((step, index) => {
        const isDone    = index < currentIndex || (index === currentIndex && step === 'delivered');
        const isCurrent = index === currentIndex && !isDone;
        const isLast    = index === STATUS_FLOW.length - 1;

        return (
          <View key={step} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ alignItems: 'center', width: 24 }}>
              {isDone ? (
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="checkmark" size={15} color="#fff" />
                </View>
              ) : isCurrent ? (
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.brandTint, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.brandFill }} />
                </View>
              ) : (
                <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D9D2CA' }} />
              )}
              {!isLast && (
                <View style={{ width: 2, flex: 1, minHeight: 22, backgroundColor: index < currentIndex ? COLORS.green : '#E2DCD5' }} />
              )}
            </View>
            <View style={{ flex: 1, paddingBottom: isLast ? 0 : 14, paddingTop: 2 }}>
              <Text style={{
                fontSize: 14,
                fontWeight: isCurrent ? '700' : '500',
                color: index > currentIndex ? COLORS.faint : COLORS.ink,
              }}>
                {STATUS_META[step].labelAr}
              </Text>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(customer)/orders/index' as any);
  }
  const locale = getCurrentLocale();
  const insets = useSafeAreaInsets();
  const { data: order, isLoading } = useOrder(id ?? '');

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.surface, padding: 16, paddingTop: insets.top + 60 }}>
        <Skeleton height={88} borderRadius={20} style={{ marginBottom: 12 }} />
        <Skeleton height={200} borderRadius={18} style={{ marginBottom: 12 }} />
        <Skeleton height={120} borderRadius={18} style={{ marginBottom: 12 }} />
        <Skeleton height={100} borderRadius={18} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, padding: 32 }}>
        <Ionicons name="receipt-outline" size={48} color={COLORS.faint} />
        <Text style={{ fontSize: 16, color: COLORS.muted, marginTop: 12 }}>{t('errors.notFound')}</Text>
        <TouchableOpacity onPress={() => goBack()} style={{ marginTop: 20, backgroundColor: COLORS.brandFill, paddingHorizontal: 28, height: 48, justifyContent: 'center', borderRadius: 14 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{t('common.back', { defaultValue: 'رجوع' })}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const meta = STATUS_META[order.status] ?? { icon: 'ellipse-outline' as const, labelAr: order.status, hint: '' };
  const cancelled = order.status === 'cancelled';
  const addr = (order.delivery_address ?? {}) as Record<string, string | null>;
  const hasAddr = Object.keys(addr).length > 0;
  const itemsCount = order.items?.length ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface, direction: 'rtl' as any }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#fff', paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', gap: 8,
      }}>
        <TouchableOpacity
          onPress={() => goBack()}
          accessibilityLabel="رجوع"
          style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="arrow-forward" size={22} color={COLORS.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.ink }}>تفاصيل الطلب</Text>
          <Text numberOfLines={1} style={{ fontSize: 12, color: COLORS.muted, marginTop: 1 }}>{order.order_number}</Text>
        </View>
        {Platform.OS === 'web' ? (
          <Pressable
            onPress={(e) => {
              e.preventDefault?.();
              e.stopPropagation?.();
              try { printOrderWindow(order, locale); } catch (err) { console.error('[PRINT]', err); }
            }}
            accessibilityLabel="طباعة"
            style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="print-outline" size={20} color={COLORS.ink} />
          </Pressable>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {/* Status hero */}
        <View style={{
          backgroundColor: cancelled ? '#FDECEC' : COLORS.ink, borderRadius: 20, padding: 18,
          flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12,
        }}>
          <View style={{
            width: 52, height: 52, borderRadius: 16,
            backgroundColor: cancelled ? '#fff' : COLORS.brand,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons name={meta.icon} size={28} color={cancelled ? COLORS.danger : COLORS.ink} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: 19, fontWeight: '700', color: cancelled ? COLORS.danger : '#fff' }}>{meta.labelAr}</Text>
            <Text style={{ fontSize: 13, color: cancelled ? COLORS.danger : '#D9D2CA' }}>{meta.hint}</Text>
            <Text style={{ fontSize: 12, color: cancelled ? COLORS.muted : '#B5ACA4', marginTop: 2, textAlign: 'right', writingDirection: 'rtl' }}>{formatDateTime(order.created_at)}</Text>
          </View>
        </View>

        <OrderTimeline status={order.status} />

        {/* Items */}
        <Card title={`${t('orders.orderItems')} (${itemsCount})`}>
          {order.items?.map((item, idx) => {
            const prod = item.product;
            const imgUrl = (prod?.images?.[0] ?? prod?.product_images?.[0])?.url;
            const name = prod
              ? getProductName(prod, locale)
              : (locale === 'ar' ? item.product_name_ar : (item.product_name_en ?? item.product_name_ar)) || '—';
            const unitLabel =
              prod?.unit_type === 'carton' && prod.pieces_per_carton
                ? `كرتونة · ${prod.pieces_per_carton} حبة`
                : prod?.unit_type === 'kg' ? 'كغ' : prod?.unit_type === 'tin' ? 'تنكة' : 'حبة';

            return (
              <View key={item.id} style={{
                flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
                borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: COLORS.line,
              }}>
                <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: COLORS.surface, padding: 6, alignItems: 'center', justifyContent: 'center' }}>
                  {imgUrl ? (
                    <Image source={{ uri: imgUrl }} style={{ width: '100%', height: '100%' }} contentFit="contain"
                      placeholder={{ blurhash: PLACEHOLDER_HASH }} transition={250} />
                  ) : (
                    <Ionicons name="cube-outline" size={24} color={COLORS.faint} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.ink, lineHeight: 19 }} numberOfLines={2}>{name}</Text>
                  <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>
                    {unitLabel} · {item.quantity} × {formatPrice(item.unit_price)}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.ink }}>{formatPrice(item.total_price)}</Text>
              </View>
            );
          })}

          {/* Totals */}
          <View style={{ borderTopWidth: 1, borderTopColor: COLORS.line, marginTop: 4, paddingTop: 12, gap: 8 }}>
            {order.delivery_fee > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, color: COLORS.muted }}>رسوم التوصيل</Text>
                <Text style={{ fontSize: 14, color: COLORS.ink }}>{formatPrice(order.delivery_fee)}</Text>
              </View>
            )}
            {order.discount_amount > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, color: COLORS.muted }}>الخصم</Text>
                <Text style={{ fontSize: 14, color: COLORS.green, fontWeight: '600' }}>−{formatPrice(order.discount_amount)}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.ink }}>{t('cart.total')}</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.ink }}>{formatPrice(order.total_amount)}</Text>
            </View>
          </View>
        </Card>

        {/* Delivery address */}
        {hasAddr && (
          <Card title="عنوان التوصيل">
            {addr.label ? <InfoRow icon="bookmark-outline" label="التسمية" value={addr.label} /> : null}
            {addr.recipient_name ? <InfoRow icon="person-outline" label="المستلم" value={addr.recipient_name} /> : null}
            {addr.phone ? <InfoRow icon="call-outline" label="الهاتف" value={addr.phone} /> : null}
            {addr.city ? <InfoRow icon="location-outline" label="المدينة" value={[addr.city, addr.district].filter(Boolean).join(' — ')} /> : null}
            {addr.street ? <InfoRow icon="navigate-outline" label="الشارع" value={addr.street} /> : null}
            {(addr.building_number || addr.floor_number || addr.apartment_number) ? (
              <InfoRow icon="business-outline" label="التفاصيل" value={[
                addr.building_number ? `مبنى ${addr.building_number}` : null,
                addr.floor_number ? `طابق ${addr.floor_number}` : null,
                addr.apartment_number ? `شقة ${addr.apartment_number}` : null,
              ].filter(Boolean).join(' — ')} />
            ) : null}
            {addr.notes ? <InfoRow icon="document-text-outline" label="ملاحظات" value={addr.notes} /> : null}
            {addr.latitude != null && addr.longitude != null && (
              <TouchableOpacity
                onPress={() => Linking.openURL(mapsUrl(Number(addr.latitude), Number(addr.longitude)))}
                activeOpacity={0.8}
                style={{
                  marginTop: 4, height: 44, borderRadius: 12, backgroundColor: COLORS.brandTint,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Ionicons name="map-outline" size={18} color={COLORS.brandText} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.brandText }}>فتح الموقع على الخريطة</Text>
              </TouchableOpacity>
            )}
          </Card>
        )}

        {/* Account info */}
        {order.profile && (
          <Card title="معلومات الحساب">
            {order.profile.full_name ? <InfoRow icon="person-outline" label="الاسم" value={order.profile.full_name} /> : null}
            {order.profile.company_name ? <InfoRow icon="business-outline" label="الشركة" value={order.profile.company_name} /> : null}
            {order.profile.email ? <InfoRow icon="mail-outline" label="البريد" value={order.profile.email} /> : null}
            {(() => {
              const phone = order.profile?.phone ?? addr.phone;
              return phone ? <InfoRow icon="call-outline" label="هاتف الشركة" value={phone} /> : null;
            })()}
          </Card>
        )}

        {/* Payment */}
        <Card title="الدفع">
          <InfoRow icon="cash-outline" label="طريقة الدفع" value={PAYMENT_METHOD_AR[order.payment_method] ?? order.payment_method} />
          <InfoRow icon="checkmark-circle-outline" label="حالة الدفع" value={PAYMENT_STATUS_AR[order.payment_status] ?? order.payment_status} />
          {order.notes ? <InfoRow icon="chatbox-ellipses-outline" label="ملاحظات الطلب" value={order.notes} /> : null}
        </Card>

        {/* Help */}
        <TouchableOpacity
          onPress={() => router.push('/(customer)/contact' as any)}
          activeOpacity={0.8}
          style={{
            height: 48, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.line,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Ionicons name="call-outline" size={18} color={COLORS.ink} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.ink }}>تواصل معنا بخصوص الطلب</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
