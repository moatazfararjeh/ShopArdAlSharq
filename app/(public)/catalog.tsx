import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, Dimensions, TouchableOpacity,
  ActivityIndicator, PanResponder, Platform, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { useProductsPage } from '@/hooks/useProducts';
import { useBrands } from '@/hooks/useBrands';
import { getCurrentLocale } from '@/i18n';
import { Product, Brand } from '@/types/models';

// ── Design constants ───────────────────────────────────────────────────────────
const HEADER_BG = '#FFFFFF';       // white — logo is visible against it
const HEADER_BORDER = '#e36523';   // orange accent line below header
const DARK      = '#2C2F34';
const ACCENT    = '#e36523';
const WHITE     = '#FFFFFF';
const LIGHT     = '#f8f8f8';
const PAGE_BG   = '#FAFAFA';

// Company info
const COMPANY_AR  = 'شركة أرض الشرق الحديثة';
const COMPANY_SUB = 'لتوزيع المواد الغذائية';
const PHONE1      = '0792881832';
const PHONE2      = '0795277537';

// ── Window size hook ──────────────────────────────────────────────────────────
function useWindowSize() {
  const [size, setSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : Dimensions.get('window').width,
    height: typeof window !== 'undefined' ? window.innerHeight : Dimensions.get('window').height,
  }));
  useEffect(() => {
    if (typeof window === 'undefined') {
      const sub = Dimensions.addEventListener('change', ({ window: w }) =>
        setSize({ width: w.width, height: w.height }),
      );
      return () => sub.remove();
    }
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF EXPORT — web: print API; native: expo-print (dynamic import)
// ═══════════════════════════════════════════════════════════════════════════════

function buildPrintHtml(products: Product[]): string {
  const rows = products.map((p) => {
    const imageUrl = p.product_images?.find((img) => img.is_primary)?.url
      ?? p.product_images?.[0]?.url ?? '';
    const nameAr = p.name_ar;
    const nameEn = p.name_en ?? '';
    const brand = (p as any).brands?.name ?? '';
    const chips: string[] = [];
    if (p.weight) chips.push(`<span class="chip"><span class="chip-icon">⚖️</span><strong>${p.weight}</strong> ${p.weight_unit ?? 'كغ'}</span>`);
    if (p.pieces_per_carton) chips.push(`<span class="chip"><span class="chip-icon">📦</span><strong>${p.pieces_per_carton}</strong> حبة / كرتون</span>`);

    return `
      <div class="product-page">
        <div class="header">
          <div class="header-logo">فود بوكس</div>
          <div class="header-center">
            <div class="company-ar">${COMPANY_AR}</div>
            <div class="company-sub">${COMPANY_SUB}</div>
          </div>
          <div class="header-right">
            ${brand ? `<span class="brand-tag">${brand}</span>` : ''}
          </div>
        </div>
        <div class="accent-bar"></div>
        <div class="name-banner">
          <div class="name-ar">${nameAr}</div>
          ${nameEn ? `<div class="name-en">${nameEn}</div>` : ''}
        </div>
        ${chips.length ? `<div class="chips-row">${chips.join('')}</div>` : ''}
        <div class="image-area">
          ${imageUrl
            ? `<img src="${imageUrl}" alt="${nameAr}" />`
            : '<div class="no-image">📦 لا توجد صورة</div>'}
        </div>
        <div class="footer">
          <span>📱 ${PHONE1}</span>
          <span class="sep">|</span>
          <span>📱 ${PHONE2}</span>
        </div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width" />
  <title>كتالوج المنتجات — ${COMPANY_AR}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #fff; direction: rtl; }

    .product-page {
      width: 210mm;
      height: 297mm;
      page-break-after: always;
      break-after: page;
      display: flex;
      flex-direction: column;
      background: #fafafa;
      border: 1px solid #ddd;
      overflow: hidden;
    }

    /* Header */
    .header {
      background: #fff;
      border-bottom: 3px solid ${ACCENT};
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .header-logo {
      font-size: 22px;
      font-weight: 900;
      color: ${DARK};
    }
    .header-logo span { color: ${ACCENT}; }
    .header-center { text-align: center; flex: 1; }
    .company-ar { font-size: 13px; font-weight: 800; color: ${DARK}; }
    .company-sub { font-size: 10px; color: #888; margin-top: 2px; }
    .header-right { min-width: 60px; text-align: left; }
    .brand-tag {
      background: ${ACCENT}22;
      color: ${ACCENT};
      font-size: 10px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 20px;
    }

    .accent-bar { height: 4px; background: ${ACCENT}; }

    /* Name banner */
    .name-banner {
      background: ${ACCENT};
      margin: 16px 20px;
      border-radius: 40px;
      padding: 12px 24px;
      text-align: center;
    }
    .name-ar { color: #fff; font-size: 17px; font-weight: 900; }
    .name-en { color: rgba(255,255,255,0.85); font-size: 12px; margin-top: 3px; }

    /* Image */
    .image-area {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px 30px;
      background: #fff;
      margin: 0 20px;
      border-radius: 12px;
      border: 1px solid #eee;
    }
    .image-area img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .no-image {
      font-size: 48px;
      color: #ccc;
      text-align: center;
    }

    /* Info chips row */
    .chips-row {
      display: flex;
      flex-direction: row;
      justify-content: center;
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px 20px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #fff;
      border: 1.5px solid ${ACCENT}55;
      border-radius: 20px;
      padding: 5px 14px;
      font-size: 14px;
      color: #333;
      font-weight: 600;
    }
    .chip strong { font-size: 15px; font-weight: 900; color: ${DARK}; }
    .chip-icon { font-size: 15px; }

    /* Footer */
    .footer {
      background: ${DARK};
      color: #fff;
      text-align: center;
      padding: 8px 16px;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: auto;
    }
    .sep { color: ${ACCENT}; }

    @media print {
      @page { size: A4 portrait; margin: 0; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .product-page { border: none; }
    }
  </style>
</head>
<body>
  <!-- Cover -->
  <div class="product-page" style="align-items:center;justify-content:center;background:#fff;">
    <div style="font-size:36px;font-weight:900;color:${DARK};margin-bottom:8px;">
      فود بوكس
    </div>
    <div style="width:80px;height:4px;background:${ACCENT};border-radius:2px;margin-bottom:24px;"></div>
    <div style="font-size:28px;font-weight:900;color:${ACCENT};letter-spacing:3px;margin-bottom:6px;">كتالوج المنتجات</div>
    <div style="font-size:14px;color:#888;margin-bottom:4px;">PRODUCT CATALOG</div>
    <div style="font-size:16px;font-weight:800;color:${DARK};margin-top:20px;">${COMPANY_AR}</div>
    <div style="font-size:12px;color:#aaa;">${COMPANY_SUB}</div>
    <div style="margin-top:40px;font-size:12px;color:#666;">📞 ${PHONE1} | ${PHONE2}</div>
  </div>

  ${rows}

  <!-- Back -->
  <div class="product-page" style="align-items:center;justify-content:center;background:${DARK};">
    <div style="font-size:28px;font-weight:900;color:#fff;margin-bottom:8px;">شكراً لاطلاعكم</div>
    <div style="font-size:13px;color:#aaa;margin-bottom:30px;">للطلب والاستفسار تواصل معنا</div>
    <div style="color:#fff;font-size:13px;margin-bottom:10px;">📱 مندوب عمان: +962${PHONE2}</div>
    <div style="color:#fff;font-size:13px;">📱 مندوب الزرقاء: +962${PHONE1}</div>
    <div style="color:#555;font-size:10px;margin-top:40px;">© 2026 ${COMPANY_AR}</div>
  </div>
</body>
</html>`;
}

async function exportToPDF(products: Product[]) {
  const html = buildPrintHtml(products);

  if (Platform.OS === 'web') {
    const win = window.open('', '_blank');
    if (!win) { alert('يرجى السماح بالنوافذ المنبثقة لتصدير PDF'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 800);
    return;
  }

  // Native: dynamic import of expo-print
  try {
    const Print = await import('expo-print');
    await (Print as any).printAsync({ html, base64: false });
  } catch {
    Alert.alert('تصدير PDF', 'هذه الميزة متاحة عبر المتصفح فقط');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface PageData {
  type: 'cover' | 'product' | 'back';
  product?: Product;
  globalIndex?: number;
  totalCount?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

export default function PublicCatalogScreen() {
  const locale = getCurrentLocale();

  const { data, isLoading } = useProductsPage(
    { availableOnly: true, limit: 2000 },
    { enabled: true },
  );
  const { data: brands } = useBrands(true);
  const allProducts: Product[] = data?.data ?? [];

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: DARK, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={{ color: WHITE, marginTop: 16, fontSize: 14 }}>جاري تحميل الكتالوج...</Text>
      </View>
    );
  }

  return <CatalogBook products={allProducts} brands={brands ?? []} locale={locale} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOG BOOK
// ═══════════════════════════════════════════════════════════════════════════════

function CatalogBook({ products, brands, locale }: { products: Product[]; brands: Brand[]; locale: string }) {
  const { width: winW, height: winH } = useWindowSize();
  const isDesktop = winW >= 900;
  const router = useRouter();
  const [exporting, setExporting] = useState(false);

  const orderedProducts = useMemo(() => {
    const brandMap = new Map(brands.map((b) => [b.id, b]));
    const withBrand = products.filter((p) => p.brand_id && brandMap.has(p.brand_id));
    const noBrand   = products.filter((p) => !p.brand_id || !brandMap.has(p.brand_id));
    withBrand.sort((a, b) => {
      const bA = brandMap.get(a.brand_id!)!;
      const bB = brandMap.get(b.brand_id!)!;
      return bA.sort_order - bB.sort_order;
    });
    return [...withBrand, ...noBrand];
  }, [products, brands]);

  const pages: PageData[] = useMemo(() => {
    const result: PageData[] = [{ type: 'cover' }];
    orderedProducts.forEach((p, i) => {
      result.push({ type: 'product', product: p, globalIndex: i + 1, totalCount: orderedProducts.length });
    });
    result.push({ type: 'back' });
    return result;
  }, [orderedProducts]);

  const spreads: [PageData, PageData | null][] = useMemo(() => {
    const result: [PageData, PageData | null][] = [];
    for (let i = 0; i < pages.length; i += 2) result.push([pages[i], pages[i + 1] ?? null]);
    return result;
  }, [pages]);

  const [spreadIdx, setSpreadIdx] = useState(0);
  const [pageIdx,   setPageIdx]   = useState(0);

  const canPrev = isDesktop ? spreadIdx > 0 : pageIdx > 0;
  const canNext = isDesktop ? spreadIdx < spreads.length - 1 : pageIdx < pages.length - 1;

  function goNext()  { isDesktop ? setSpreadIdx((s) => Math.min(spreads.length - 1, s + 1)) : setPageIdx((s) => Math.min(pages.length - 1, s + 1)); }
  function goPrev()  { isDesktop ? setSpreadIdx((s) => Math.max(0, s - 1)) : setPageIdx((s) => Math.max(0, s - 1)); }
  function goFirst() { isDesktop ? setSpreadIdx(0) : setPageIdx(0); }
  function goLast()  { isDesktop ? setSpreadIdx(spreads.length - 1) : setPageIdx(pages.length - 1); }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => { if (g.dx > 50) goPrev(); else if (g.dx < -50) goNext(); },
    }),
  ).current;

  const bookW = isDesktop ? winW - 160 : winW;
  // On mobile: subtract toolbar (~60px), dots+indicator (~52px), and a buffer
  // for the safe-area-inset-top (approx 50px max on iPhone).  Using a generous
  // constant keeps the book within the viewport on all phone sizes.
  const bookH = isDesktop ? Math.min(winH - 120, 820) : winH - 160;
  const pageW = isDesktop ? bookW / 2 : bookW;

  const [leftPage, rightPage] = spreads[spreadIdx];
  const currentPage = pages[pageIdx];
  const currentLabel = isDesktop
    ? `${spreadIdx * 2 + 1}–${Math.min(spreadIdx * 2 + 2, pages.length)}`
    : `${pageIdx + 1}`;

  async function handleExport() {
    setExporting(true);
    try {
      await exportToPDF(orderedProducts);
    } finally {
      setExporting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#1e1e1e', alignItems: 'center' }}>
      {/* ── Top toolbar ── */}
      <View style={{
        width: '100%', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8,
        // Push content below the status bar on mobile web (viewport-fit=cover)
        paddingTop: Platform.OS === 'web' ? 'env(safe-area-inset-top, 8px)' as any : 8,
        backgroundColor: '#111',
      }}>
        <TouchableOpacity
          onPress={() => router.replace('/(public)/login')}
          style={{ backgroundColor: ACCENT, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 }}
        >
          <Text style={{ color: WHITE, fontSize: 12, fontWeight: '700' }}>تسجيل الدخول</Text>
        </TouchableOpacity>

        <Text style={{ color: WHITE, fontSize: 13, fontWeight: '800' }}>كتالوج المنتجات</Text>

        <TouchableOpacity
          onPress={handleExport}
          disabled={exporting}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 5,
            backgroundColor: exporting ? '#555' : '#fff',
            borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
          }}
        >
          <Text style={{ fontSize: 13 }}>📄</Text>
          <Text style={{ color: exporting ? '#aaa' : DARK, fontSize: 12, fontWeight: '700' }}>
            {exporting ? 'جاري التصدير...' : 'تصدير PDF'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Book ── */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <View
          {...(!isDesktop ? panResponder.panHandlers : {})}
          style={{
            width: bookW, height: bookH,
            flexDirection: isDesktop ? 'row' : 'column',
            borderRadius: isDesktop ? 6 : 0,
            overflow: 'hidden',
            backgroundColor: WHITE,
            shadowColor: '#000', shadowOpacity: 0.6,
            shadowRadius: 40, shadowOffset: { width: 0, height: 12 },
            elevation: 20,
          }}
        >
          {/* Spine */}
          {isDesktop && (
            <View style={{
              position: 'absolute', top: 0, bottom: 0, left: '50%',
              width: 8, marginLeft: -4, zIndex: 20,
              backgroundColor: '#bbb',
              shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: -3, height: 0 },
            }} />
          )}

          {isDesktop ? (
            <>
              <View style={{ flex: 1 }}>
                <CatalogPage page={leftPage}  locale={locale} width={pageW} height={bookH} />
              </View>
              <View style={{ flex: 1 }}>
                {rightPage
                  ? <CatalogPage page={rightPage} locale={locale} width={pageW} height={bookH} />
                  : <View style={{ flex: 1, backgroundColor: LIGHT }} />}
              </View>
            </>
          ) : (
            <CatalogPage page={currentPage} locale={locale} width={pageW} height={bookH} />
          )}

          {/* Nav arrows */}
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <NavBtn side="left"  onPress={goNext}  onLongPress={goLast}  disabled={!canNext} />
            <NavBtn side="right" onPress={goPrev}  onLongPress={goFirst} disabled={!canPrev} />
          </View>
        </View>
      </View>

      {/* ── Page indicator + dots ── */}
      <Text style={{ color: '#888', fontSize: 11, marginTop: 6 }}>
        {currentLabel} / {pages.length} صفحة
      </Text>
      <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 360 }}>
        {(isDesktop ? spreads : pages).map((_, i) => {
          const active = isDesktop ? i === spreadIdx : i === pageIdx;
          return (
            <TouchableOpacity key={i} onPress={() => isDesktop ? setSpreadIdx(i) : setPageIdx(i)}>
              <View style={{ width: active ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: active ? ACCENT : '#444' }} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE ROUTER
// ═══════════════════════════════════════════════════════════════════════════════

function CatalogPage({ page, locale, width, height }: { page: PageData; locale: string; width: number; height: number }) {
  if (page.type === 'cover')   return <CoverPage   width={width} height={height} />;
  if (page.type === 'back')    return <BackPage    width={width} height={height} />;
  if (page.type === 'product' && page.product)
    return <ProductPage product={page.product} locale={locale} index={page.globalIndex!} total={page.totalCount!} width={width} height={height} />;
  return <View style={{ flex: 1, backgroundColor: LIGHT }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COVER PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function CoverPage({ width, height }: { width: number; height: number }) {
  return (
    <View style={{ width, height, backgroundColor: WHITE, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: ACCENT + '10' }} />
      <View style={{ position: 'absolute', bottom: -80, left: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: DARK + '06' }} />
      <View style={{ width: '100%', height: 8, backgroundColor: ACCENT }} />
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, backgroundColor: ACCENT }} />

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 14 }}>
        <Image source={require('@/assets/logo.png')} style={{ width: 200, height: 80 }} contentFit="contain" />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: '80%' }}>
          <View style={{ flex: 1, height: 1.5, backgroundColor: ACCENT + '40' }} />
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: ACCENT }} />
          <View style={{ flex: 1, height: 1.5, backgroundColor: ACCENT + '40' }} />
        </View>

        <View style={{ backgroundColor: DARK, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: ACCENT, textAlign: 'center', letterSpacing: 2 }}>كتالوج المنتجات</Text>
          <Text style={{ fontSize: 10, color: WHITE + '99', textAlign: 'center' }}>PRODUCT CATALOG</Text>
        </View>

        <View style={{ alignItems: 'center', marginTop: 6 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: DARK, textAlign: 'center' }}>{COMPANY_AR}</Text>
          <Text style={{ fontSize: 11, color: '#888', marginTop: 3, textAlign: 'center' }}>{COMPANY_SUB}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
          {['🧀', '🥩', '🥦', '🛒', '🥚'].map((emoji) => (
            <View key={emoji} style={{ width: 40, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: ACCENT + '35', alignItems: 'center', justifyContent: 'center', backgroundColor: LIGHT }}>
              <Text style={{ fontSize: 20 }}>{emoji}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ backgroundColor: DARK, paddingVertical: 8, alignItems: 'center', gap: 2 }}>
        <Text style={{ color: ACCENT, fontSize: 11, fontWeight: '700' }}>📞 {PHONE1}  |  {PHONE2}</Text>
        <Text style={{ color: '#aaa', fontSize: 9 }}>للطلب والاستفسار عبر واتساب</Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function ProductPage({ product, locale, index, total, width, height }: {
  product: Product; locale: string; index: number; total: number; width: number; height: number;
}) {
  const nameAr = product.name_ar;
  const nameEn = product.name_en;
  const imageUrl = product.product_images?.find((img) => img.is_primary)?.url
    ?? product.product_images?.[0]?.url;
  const brandName = (product as any).brands?.name ?? null;

  // Build individual info chips
  const chips: { icon: string; value: string; label: string }[] = [];
  if (product.weight)
    chips.push({ icon: '⚖️', value: `${product.weight}`, label: product.weight_unit ?? 'كغ' });
  if (product.pieces_per_carton)
    chips.push({ icon: '📦', value: `${product.pieces_per_carton}`, label: 'حبة / كرتون' });
  if (product.unit_type === 'kg' || product.price_per_kg)
    chips.push({ icon: '🏷️', value: 'بالكيلو', label: '' });
  if (product.unit_type === 'carton' || product.price_per_carton)
    chips.push({ icon: '🗃️', value: 'بالكرتون', label: '' });

  return (
    <View style={{ width, height, backgroundColor: PAGE_BG }}>

      {/* ── Header — white background so logo is visible ── */}
      <View style={{
        backgroundColor: HEADER_BG,
        borderBottomWidth: 3,
        borderBottomColor: HEADER_BORDER,
        paddingHorizontal: 12, paddingVertical: 8,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Image source={require('@/assets/logo.png')} style={{ width: 90, height: 36 }} contentFit="contain" />

        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ color: DARK, fontSize: 10, fontWeight: '800', textAlign: 'center' }}>{COMPANY_AR}</Text>
          <Text style={{ color: '#888', fontSize: 8, marginTop: 1, textAlign: 'center' }}>{COMPANY_SUB}</Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#aaa', fontSize: 9 }}>{index} / {total}</Text>
          {brandName && (
            <View style={{ backgroundColor: ACCENT + '20', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginTop: 2 }}>
              <Text style={{ color: ACCENT, fontSize: 8, fontWeight: '700' }}>{brandName}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Product name banner ── */}
      <View style={{
        backgroundColor: ACCENT,
        marginHorizontal: 14, marginTop: 10,
        borderRadius: 30, paddingVertical: 9, paddingHorizontal: 18,
        alignItems: 'center', gap: 2,
      }}>
        <Text style={{ color: WHITE, fontSize: 14, fontWeight: '900', textAlign: 'center' }} numberOfLines={1}>
          {nameAr}
        </Text>
        {nameEn && (
          <Text style={{ color: WHITE + 'cc', fontSize: 11, textAlign: 'center' }} numberOfLines={1}>
            {nameEn}
          </Text>
        )}
      </View>

      {/* ── Info chips — weight, units, carton size ── */}
      {chips.length > 0 && (
        <View style={{
          flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap',
          gap: 8, marginHorizontal: 14, marginTop: 8,
        }}>
          {chips.map((chip, i) => (
            <View key={i} style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: WHITE,
              borderWidth: 1.5, borderColor: ACCENT + '55',
              borderRadius: 20,
              paddingHorizontal: 12, paddingVertical: 5,
              shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
            }}>
              <Text style={{ fontSize: 14 }}>{chip.icon}</Text>
              <Text style={{ fontSize: 14, fontWeight: '900', color: DARK }}>{chip.value}</Text>
              {chip.label !== '' && (
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#666' }}>{chip.label}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* ── Product image ── */}
      <View style={{
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 16, paddingVertical: 8,
        marginHorizontal: 14, marginTop: 8,
        backgroundColor: WHITE, borderRadius: 12,
        borderWidth: 1, borderColor: '#eee',
      }}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={{ width: '90%', height: '90%' }} contentFit="contain" />
        ) : (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 42 }}>📦</Text>
            <Text style={{ color: '#ccc', fontSize: 11, marginTop: 6 }}>لا توجد صورة</Text>
          </View>
        )}
      </View>

      <View style={{ height: 8 }} />

      {/* ── Footer ── */}
      <View style={{
        backgroundColor: DARK, paddingVertical: 7,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Text style={{ fontSize: 10 }}>📱</Text>
          <Text style={{ fontSize: 9, color: WHITE, fontWeight: '600' }}>{PHONE1}</Text>
        </View>
        <Text style={{ fontSize: 9, color: ACCENT, fontWeight: '700' }}>للتواصل</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Text style={{ fontSize: 10 }}>📱</Text>
          <Text style={{ fontSize: 9, color: WHITE, fontWeight: '600' }}>{PHONE2}</Text>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BACK PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function BackPage({ width, height }: { width: number; height: number }) {
  return (
    <View style={{ width, height, backgroundColor: DARK, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
      <View style={{ position: 'absolute', top: -50, left: -50, width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: ACCENT + '20' }} />
      <View style={{ position: 'absolute', bottom: -60, right: -60, width: 240, height: 240, borderRadius: 120, borderWidth: 1, borderColor: WHITE + '08' }} />

      <Image source={require('@/assets/logo.png')} style={{ width: 160, height: 60, marginBottom: 20 }} contentFit="contain" />

      <Text style={{ fontSize: 22, fontWeight: '900', color: WHITE, textAlign: 'center', marginBottom: 6 }}>شكراً لاطلاعكم</Text>
      <Text style={{ fontSize: 13, color: '#aaa', textAlign: 'center', marginBottom: 28 }}>للطلب والاستفسار تواصل معنا</Text>

      <View style={{ gap: 10, width: '100%', alignItems: 'center' }}>
        {[
          { label: 'مندوب عمان', phone: PHONE2 },
          { label: 'مندوب الزرقاء', phone: PHONE1 },
        ].map(({ label, phone }) => (
          <View key={phone} style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            backgroundColor: WHITE + '08', borderRadius: 12,
            paddingHorizontal: 20, paddingVertical: 10, width: '100%', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 16 }}>📱</Text>
            <Text style={{ fontSize: 13, color: WHITE, fontWeight: '600' }}>{label}: +962{phone}</Text>
          </View>
        ))}
      </View>

      <Text style={{ fontSize: 10, color: '#555', marginTop: 36 }}>© 2026 {COMPANY_AR} — جميع الحقوق محفوظة</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAV BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

function NavBtn({ side, onPress, onLongPress, disabled }: {
  side: 'left' | 'right'; onPress: () => void; onLongPress?: () => void; disabled: boolean;
}) {
  const isLeft = side === 'left';
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      style={{
        width: 36, height: 80,
        borderTopLeftRadius:     isLeft ? 0 : 40,
        borderBottomLeftRadius:  isLeft ? 0 : 40,
        borderTopRightRadius:    isLeft ? 40 : 0,
        borderBottomRightRadius: isLeft ? 40 : 0,
        backgroundColor: disabled ? 'rgba(0,0,0,0.15)' : DARK + 'BB',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 22, color: disabled ? 'rgba(255,255,255,0.2)' : WHITE, fontWeight: '900' }}>
        {isLeft ? '‹' : '›'}
      </Text>
    </TouchableOpacity>
  );
}
