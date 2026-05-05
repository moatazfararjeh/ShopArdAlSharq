import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOrder } from '@/hooks/useOrders';
import { formatPrice } from '@/utils/formatPrice';
import { formatDateTime } from '@/utils/formatDate';
import { getCurrentLocale } from '@/i18n';
import { getProductName, Order } from '@/types/models';

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
      : prod?.unit_type === 'kg' ? 'كغ' : 'قطعة';
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

  <script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=800,height=900');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending:    { bg: '#fff7ed', text: '#ea580c', label: '⏳' },
  confirmed:  { bg: '#eff6ff', text: '#2563eb', label: '✅' },
  preparing:  { bg: '#fefce8', text: '#ca8a04', label: '👨‍🍳' },
  shipped:    { bg: '#f5f3ff', text: '#7c3aed', label: '🚚' },
  delivered:  { bg: '#f0fdf4', text: '#15803d', label: '📦' },
  cancelled:  { bg: '#fef2f2', text: '#dc2626', label: '❌' },
};

// Ordered flow — cancelled is handled separately
const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'] as const;

const STATUS_META: Record<string, { icon: string; labelAr: string }> = {
  pending:   { icon: '⏳', labelAr: 'قيد الانتظار' },
  confirmed: { icon: '✅', labelAr: 'تم التأكيد' },
  preparing: { icon: '👨‍🍳', labelAr: 'جارٍ التحضير' },
  shipped:   { icon: '🚚', labelAr: 'طلبك في الطريق' },
  delivered: { icon: '📦', labelAr: 'تم التسليم' },
  cancelled: { icon: '❌', labelAr: 'ملغى' },
};

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
      <Text style={{ fontSize: 13, color: '#111827', fontWeight: '600', flex: 1, textAlign: 'right' }}>{value}</Text>
      <Text style={{ fontSize: 12, color: '#9ca3af', width: 90, paddingTop: 1, textAlign: 'right' }}>{label}</Text>
      <Text style={{ fontSize: 14, width: 22, textAlign: 'right' }}>{icon}</Text>
    </View>
  );
}

function OrderTimeline({ status }: { status: string }) {
  if (status === 'cancelled') {
    return (
      <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 12 }}>سير الطلب</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 18 }}>❌</Text>
          </View>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#dc2626' }}>تم إلغاء الطلب</Text>
        </View>
      </View>
    );
  }

  const currentIndex = STATUS_FLOW.indexOf(status as typeof STATUS_FLOW[number]);

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
      <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 14 }}>سير الطلب</Text>
      {STATUS_FLOW.map((step, index) => {
        const isDone    = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture  = index > currentIndex;
        const isLast    = index === STATUS_FLOW.length - 1;
        const meta      = STATUS_META[step];

        const dotColor  = isDone ? '#e36523' : isCurrent ? '#e36523' : '#e5e7eb';
        const lineColor = index < currentIndex ? '#e36523' : '#e5e7eb';

        return (
          <View key={step} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            {/* Label */}
            <View style={{ flex: 1, paddingEnd: 12, paddingBottom: isLast ? 0 : 18, justifyContent: 'center', paddingTop: isCurrent ? 6 : 4 }}>
              <Text style={{
                fontSize: isCurrent ? 14 : 13,
                fontWeight: isCurrent ? '800' : isDone ? '600' : '500',
                color: isCurrent ? '#e36523' : isDone ? '#111827' : '#9ca3af',
                textAlign: 'right',
              }}>
                {meta.labelAr}
              </Text>
              {isCurrent && (
                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, textAlign: 'right' }}>الحالة الحالية</Text>
              )}
            </View>

            {/* Dot + vertical line */}
            <View style={{ alignItems: 'center', width: 38 }}>
              <View style={{
                width: isCurrent ? 38 : 32,
                height: isCurrent ? 38 : 32,
                borderRadius: isCurrent ? 19 : 16,
                backgroundColor: isCurrent ? '#fff0eb' : isDone ? '#fff0eb' : '#f3f4f6',
                borderWidth: isCurrent ? 2.5 : isDone ? 2 : 1.5,
                borderColor: dotColor,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {isDone
                  ? <Text style={{ fontSize: 14 }}>✓</Text>
                  : <Text style={{ fontSize: isCurrent ? 18 : 14, opacity: isFuture ? 0.4 : 1 }}>{meta.icon}</Text>
                }
              </View>
              {!isLast && (
                <View style={{ width: 2.5, flex: 1, minHeight: 22, backgroundColor: lineColor, marginVertical: 3, borderRadius: 2 }} />
              )}
            </View>
          </View>
        );
      })}
    </View>
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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>😕</Text>
        <Text style={{ fontSize: 16, color: '#6b7280' }}>{t('errors.notFound')}</Text>
        <TouchableOpacity onPress={() => goBack()} style={{ marginTop: 20, backgroundColor: '#f97316', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{t('common.back', { defaultValue: 'رجوع' })}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusConfig = STATUS_COLORS[order.status] ?? { bg: '#f3f4f6', text: '#6b7280', label: '•' };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#ffffff',
        paddingTop: insets.top + 8,
        paddingBottom: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {Platform.OS === 'web' && (
            <TouchableOpacity
              onPress={() => printOrderWindow(order, locale)}
              style={{ backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5 }}
            >
              <Text style={{ fontSize: 14 }}>🖨️</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151' }}>طباعة</Text>
            </TouchableOpacity>
          )}
          <View style={{ backgroundColor: statusConfig.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 12 }}>{statusConfig.label}</Text>
            <Text style={{ color: statusConfig.text, fontSize: 12, fontWeight: '700' }}>
              {t(`orders.status.${order.status}`, { defaultValue: order.status })}
            </Text>
          </View>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>
            {t('orders.orderNumber')} #{order.order_number}
          </Text>
          <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>
            🗓 {formatDateTime(order.created_at)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => goBack()}
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginStart: 12 }}
        >
          <Text style={{ fontSize: 18 }}>›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* Timeline */}
        <OrderTimeline status={order.status} />

        {/* Items section */}
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 12, marginTop: 4 }}>
          {t('orders.orderItems')}
        </Text>

        {order.items?.map((item) => {
          const prod = item.product;
          const imgUrl = (prod?.images?.[0] ?? prod?.product_images?.[0])?.url;
          const name = prod
            ? getProductName(prod, locale)
            : (locale === 'ar' ? item.product_name_ar : (item.product_name_en ?? item.product_name_ar)) || '—';
          const unitLabel =
            prod?.unit_type === 'carton' && prod.pieces_per_carton
              ? `كرتون (${prod.pieces_per_carton} حبة)`
              : prod?.unit_type === 'kg' ? 'كغ' : 'قطعة';

          return (
            <View
              key={item.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 18,
                padding: 14,
                marginBottom: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 5,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#f97316', marginEnd: 4 }}>
                  {formatPrice(item.total_price)}
                </Text>
                <View style={{ flex: 1, marginEnd: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', lineHeight: 20, textAlign: 'right' }} numberOfLines={2}>
                    {name}
                  </Text>
                  {prod?.weight ? (
                    <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, textAlign: 'right' }}>
                      ⚖️ {prod.weight} {prod.weight_unit ?? 'كغ'}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>
                      {item.quantity} × {formatPrice(item.unit_price)}
                    </Text>
                    <View style={{ backgroundColor: '#fff7ed', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 11, color: '#ea580c', fontWeight: '700' }}>{unitLabel}</Text>
                    </View>
                  </View>
                </View>
                {imgUrl ? (
                  <Image
                    source={{ uri: imgUrl }}
                    style={{ width: 72, height: 72, borderRadius: 14 }}
                    contentFit="cover"
                  />
                ) : (
                  <View style={{ width: 72, height: 72, borderRadius: 14, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 28 }}>📦</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* Total card */}
        <View style={{
          backgroundColor: '#ffffff',
          borderRadius: 20,
          padding: 16,
          marginTop: 8,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.07,
          shadowRadius: 8,
          elevation: 3,
        }}>
          {order.delivery_fee > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600' }}>{formatPrice(order.delivery_fee)}</Text>
              <Text style={{ fontSize: 13, color: '#6b7280' }}>رسوم التوصيل</Text>
            </View>
          )}
          {order.discount_amount > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: '#16a34a', fontWeight: '600' }}>- {formatPrice(order.discount_amount)}</Text>
              <Text style={{ fontSize: 13, color: '#6b7280' }}>الخصم</Text>
            </View>
          )}
          <View style={{ height: 1, backgroundColor: '#f3f4f6', marginBottom: 10 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#f97316' }}>
              {formatPrice(order.total_amount)}
            </Text>
            <Text style={{ fontSize: 15, color: '#6b7280', fontWeight: '600' }}>{t('cart.total')}</Text>
          </View>
        </View>

        {/* Delivery address */}
        {order.delivery_address && Object.keys(order.delivery_address).length > 0 && (() => {
          const addr = order.delivery_address as Record<string, string | null>;
          return (
            <View style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 16,
              marginBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 3,
            }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 12 }}>📍 عنوان التوصيل</Text>
              {addr.label ? (
                <View style={{ backgroundColor: '#fff7ed', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-end', marginBottom: 10 }}>
                  <Text style={{ fontSize: 11, color: '#ea580c', fontWeight: '700' }}>{addr.label}</Text>
                </View>
              ) : null}
              {addr.recipient_name ? <InfoRow icon="👤" label="المستلم" value={addr.recipient_name} /> : null}
              {addr.phone ? <InfoRow icon="📞" label="الهاتف" value={addr.phone} /> : null}
              {addr.city ? <InfoRow icon="🏙️" label="المدينة" value={[addr.city, addr.district].filter(Boolean).join(' — ')} /> : null}
              {addr.street ? <InfoRow icon="🛣️" label="الشارع" value={addr.street} /> : null}
              {(addr.building_number || addr.floor_number || addr.apartment_number) ? (
                <InfoRow icon="🏢" label="التفاصيل" value={[
                  addr.building_number ? `مبنى ${addr.building_number}` : null,
                  addr.floor_number ? `طابق ${addr.floor_number}` : null,
                  addr.apartment_number ? `شقة ${addr.apartment_number}` : null,
                ].filter(Boolean).join(' — ')} />
              ) : null}
              {addr.notes ? <InfoRow icon="📝" label="ملاحظات العنوان" value={addr.notes} /> : null}
            </View>
          );
        })()}

        {/* Account info */}
        {order.profile && (
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 20,
            padding: 16,
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 3,
          }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 12 }}>👤 معلومات الحساب</Text>
            {order.profile.full_name ? <InfoRow icon="🙍" label="الاسم" value={order.profile.full_name} /> : null}
            {order.profile.company_name ? <InfoRow icon="🏢" label="الشركة" value={order.profile.company_name} /> : null}
            {order.profile.email ? <InfoRow icon="📧" label="البريد" value={order.profile.email} /> : null}
            {(() => {
              const phone = order.profile?.phone ?? (order.delivery_address as Record<string, string | null>)?.phone;
              return phone ? <InfoRow icon="📞" label="هاتف الشركة" value={phone} /> : null;
            })()}
          </View>
        )}

        {/* Payment & order info */}
        <View style={{
          backgroundColor: '#ffffff',
          borderRadius: 20,
          padding: 16,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 12 }}>💳 معلومات الطلب</Text>
          <InfoRow icon="💰" label="طريقة الدفع" value={
            order.payment_method === 'cash_on_delivery' ? 'الدفع عند الاستلام' :
            order.payment_method === 'bank_transfer' ? 'تحويل بنكي' :
            order.payment_method === 'credit_card' ? 'بطاقة ائتمان' :
            order.payment_method
          } />
          <InfoRow icon="✅" label="حالة الدفع" value={
            order.payment_status === 'paid' ? 'مدفوع' :
            order.payment_status === 'pending' ? 'قيد الانتظار' :
            order.payment_status === 'failed' ? 'فشل الدفع' :
            order.payment_status === 'refunded' ? 'مسترد' :
            order.payment_status
          } />
          {order.notes ? <InfoRow icon="📋" label="ملاحظات الطلب" value={order.notes} /> : null}
        </View>
      </ScrollView>
    </View>
  );
}

