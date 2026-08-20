import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, Dimensions, TouchableOpacity,
  ActivityIndicator, PanResponder, Platform, Alert, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { useProductsPage } from '@/hooks/useProducts';
import { useBrands } from '@/hooks/useBrands';
import { useCategories } from '@/hooks/useCategories';
import { getCurrentLocale } from '@/i18n';
import { Product, Brand, Category } from '@/types/models';

// ── Design constants ───────────────────────────────────────────────────────────
const HEADER_BG     = '#FFFFFF';
const HEADER_BORDER = '#e36523';   // orange accent line below header
const DARK           = '#2C2F34';
const ACCENT          = '#e36523'; // orange
const WHITE            = '#FFFFFF';
const LIGHT              = '#f8f8f8';
const PAGE_BG              = '#FAFAFA';

// Company info
const COMPANY_AR  = 'شركة أرض الشرق الحديثة';
const COMPANY_SUB = 'لتوزيع المواد الغذائية';
const PHONE1      = '0792881832';
const PHONE2      = '0795277537';

const PAGE_SIZE = 6;
const OTHER_LABEL_AR = 'منتجات أخرى';

// ── Window size hook ──────────────────────────────────────────────────────────
function useWindowSize() {
  const [size, setSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : Dimensions.get('window').width,
    height: typeof window !== 'undefined' ? window.innerHeight : Dimensions.get('window').height,
  }));
  useEffect(() => {
    if (Platform.OS !== 'web') {
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
// GROUPING — shared by the on-screen book and the PDF export so both stay in sync
// ═══════════════════════════════════════════════════════════════════════════════

interface CatalogGroup {
  brand: Brand | null;
  category: Category | null;
  products: Product[];
}

function buildCatalogGroups(products: Product[], brands: Brand[], categories: Category[]): CatalogGroup[] {
  const brandMap = new Map(brands.map((b) => [b.id, b]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const brandOrder: (string | null)[] = [];
  const byBrand = new Map<string | null, Map<string | null, Product[]>>();

  for (const p of products) {
    const brandKey = p.brand_id && brandMap.has(p.brand_id) ? p.brand_id : null;
    const categoryKey = p.category_id && categoryMap.has(p.category_id) ? p.category_id : null;

    if (!byBrand.has(brandKey)) {
      byBrand.set(brandKey, new Map());
      brandOrder.push(brandKey);
    }
    const byCategory = byBrand.get(brandKey)!;
    if (!byCategory.has(categoryKey)) byCategory.set(categoryKey, []);
    byCategory.get(categoryKey)!.push(p);
  }

  brandOrder.sort((a, b) => {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return brandMap.get(a)!.sort_order - brandMap.get(b)!.sort_order;
  });

  const groups: CatalogGroup[] = [];
  for (const brandKey of brandOrder) {
    const byCategory = byBrand.get(brandKey)!;
    const categoryKeys = Array.from(byCategory.keys());
    categoryKeys.sort((a, b) => {
      if (a === null && b === null) return 0;
      if (a === null) return 1;
      if (b === null) return -1;
      return categoryMap.get(a)!.sort_order - categoryMap.get(b)!.sort_order;
    });

    for (const categoryKey of categoryKeys) {
      const list = byCategory.get(categoryKey)!;
      for (let i = 0; i < list.length; i += PAGE_SIZE) {
        groups.push({
          brand: brandKey ? brandMap.get(brandKey)! : null,
          category: categoryKey ? categoryMap.get(categoryKey)! : null,
          products: list.slice(i, i + PAGE_SIZE),
        });
      }
    }
  }
  return groups;
}

/** A single product's card scales up when its page has very few items, mirroring the reference catalog. */
function cardWidthPct(count: number, cols: number): number {
  if (count === 1) return 60;
  if (count === 2) return 45;
  return cols === 3 ? 30 : 47;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF EXPORT — web: print API; native: expo-print (dynamic import)
// ═══════════════════════════════════════════════════════════════════════════════

function buildGroupPageHtml(group: CatalogGroup, pageNumber: number): string {
  const categoryLabel = group.category?.name_ar ?? OTHER_LABEL_AR;
  const brandHeader = group.brand?.image_url
    ? `<img src="${group.brand.image_url}" alt="${group.brand.name}" />`
    : `<div class="brand-name">${group.brand?.name ?? OTHER_LABEL_AR}</div>`;

  const count = group.products.length;
  const gridColsClass = count === 1 ? 'cols-1' : count === 2 ? 'cols-2' : '';

  const cards = group.products.map((p) => {
    const imageUrl = p.product_images?.find((img) => img.is_primary)?.url ?? p.product_images?.[0]?.url;
    const weight = p.weight ? `${p.weight} ${p.weight_unit ?? 'كغ'}` : '—';
    const packaging = p.pieces_per_carton ?? '—';
    return `
      <div class="product-card">
        <div class="img-wrap">
          ${imageUrl ? `<img src="${imageUrl}" alt="${p.name_ar}" />` : '<span class="no-img">📦</span>'}
        </div>
        <div class="p-name">${p.name_ar}</div>
        <div class="p-stats">
          <div class="p-stat"><span class="lbl">التعبئة</span><span class="val">${packaging}</span></div>
          <div class="p-stat"><span class="lbl">الوزن</span><span class="val">${weight}</span></div>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="cat-page">
      <div class="cat-frame grid-frame">
        <div class="grid-main">
          <div class="brand-header">${brandHeader}</div>
          <div class="products-grid ${gridColsClass}">${cards}</div>
          <div class="grid-footer"><strong>فود بوكس</strong><span>${COMPANY_AR}</span></div>
        </div>
        <div class="category-tab"><span>${categoryLabel}</span></div>
      </div>
      <div class="page-badge">${pageNumber}</div>
    </div>`;
}

function buildPrintHtml(groups: CatalogGroup[], brands: Brand[]): string {
  const brandCards = brands.map((b) => `
    <div class="brand-card">
      ${b.image_url ? `<img src="${b.image_url}" alt="${b.name}" />` : `<span>${b.name}</span>`}
    </div>`).join('');

  const groupPages = groups.map((g, i) => buildGroupPageHtml(g, i + 3)).join('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width" />
  <title>كتالوج المنتجات — ${COMPANY_AR}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #fff; direction: rtl; }

    .cat-page {
      width: 210mm; height: 297mm;
      page-break-after: always; break-after: page;
      background: ${PAGE_BG}; position: relative; overflow: hidden;
      padding: 6mm; box-sizing: border-box;
    }
    .cat-frame {
      width: 100%; height: 100%;
      border: 2px solid ${ACCENT}; border-radius: 14px;
      background: #fff; box-sizing: border-box; overflow: hidden;
      display: flex; flex-direction: column; position: relative;
    }
    .cat-frame.dark { background: ${DARK}; }

    /* Cover */
    .cover-logo { font-size: 26px; font-weight: 900; color: ${DARK}; }
    .cover-badge {
      background: #f8f8f8; border: 1.5px solid ${ACCENT}55; border-radius: 12px;
      padding: 14px 26px; margin: 16px 0;
    }
    .cover-badge .title { font-size: 22px; font-weight: 900; color: ${ACCENT}; letter-spacing: 2px; }
    .cover-badge .sub { font-size: 10px; color: #999; margin-top: 4px; }
    .cover-company { font-size: 15px; font-weight: 800; color: ${DARK}; }
    .cover-company-sub { font-size: 11px; color: #888; margin-top: 3px; }
    .cover-footer { background: ${ACCENT}; color: #fff; text-align: center; padding: 10px; font-size: 11px; }

    /* Brand index */
    .brands-title { text-align: center; font-size: 16px; font-weight: 900; color: ${DARK}; padding: 16px 0 6px; }
    .brands-grid { flex: 1; display: flex; flex-wrap: wrap; justify-content: center; align-content: flex-start; gap: 14px; padding: 10px 24px 24px; }
    .brand-card {
      width: 28%; aspect-ratio: 1.6; border-radius: 10px; background: #f8f8f8;
      display: flex; align-items: center; justify-content: center; padding: 10px;
    }
    .brand-card img { max-width: 90%; max-height: 90%; object-fit: contain; }
    .brand-card span { font-size: 12px; font-weight: 800; color: ${DARK}; text-align: center; }

    /* Grid pages */
    .grid-frame { flex-direction: row; }
    .grid-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .brand-header { text-align: center; padding: 12px 12px 6px; }
    .brand-header img { max-width: 150px; max-height: 48px; object-fit: contain; }
    .brand-header .brand-name { font-size: 15px; font-weight: 900; color: ${DARK}; }
    .products-grid {
      flex: 1; display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 10px; padding: 6px 14px; align-content: start;
    }
    .products-grid.cols-1 { grid-template-columns: 1fr; justify-items: center; }
    .products-grid.cols-2 { grid-template-columns: repeat(2, 1fr); justify-items: center; }
    .product-card {
      border: 1.5px solid ${ACCENT}55; border-radius: 10px; padding: 7px;
      background: #fff; display: flex; flex-direction: column; width: 100%;
    }
    .product-card .img-wrap {
      aspect-ratio: 1; background: #f8f8f8; border-radius: 8px;
      display: flex; align-items: center; justify-content: center; overflow: hidden;
    }
    .product-card img { max-width: 90%; max-height: 90%; object-fit: contain; }
    .product-card .no-img { font-size: 26px; color: #ccc; }
    .product-card .p-name { font-size: 11px; font-weight: 800; color: ${DARK}; text-align: center; margin-top: 5px; min-height: 28px; }
    .product-card .p-stats { display: flex; border-top: 1px solid #eee; margin-top: 5px; padding-top: 5px; }
    .product-card .p-stat { flex: 1; text-align: center; }
    .product-card .p-stat:first-child { border-left: 1px solid #eee; }
    .product-card .lbl { font-size: 8px; color: #999; display: block; }
    .product-card .val { font-size: 10px; font-weight: 800; color: ${DARK}; }
    .grid-footer { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px; border-top: 1px solid #eee; }
    .grid-footer strong { font-size: 10px; color: ${DARK}; }
    .grid-footer span { font-size: 9px; color: #888; }
    .category-tab { width: 24px; background: ${ACCENT}; display: flex; align-items: center; justify-content: center; }
    .category-tab span {
      color: #fff; font-size: 12px; font-weight: 800;
      writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap;
    }
    .page-badge {
      position: absolute; bottom: 10mm; left: 10mm; width: 24px; height: 24px; border-radius: 50%;
      background: ${ACCENT}; color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 900; z-index: 5;
    }

    /* Back page */
    .back-title { font-size: 22px; font-weight: 900; color: #fff; }
    .back-sub { font-size: 13px; color: #aaa; margin-bottom: 20px; }
    .back-row { display: flex; align-items: center; justify-content: center; gap: 10px; background: ${ACCENT}22; border-radius: 12px; padding: 10px 20px; width: 80%; margin: 6px auto; color: #fff; font-size: 13px; }
    .back-copy { font-size: 10px; color: #777; margin-top: 30px; }

    @media print {
      @page { size: A4 portrait; margin: 0; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <!-- Cover -->
  <div class="cat-page">
    <div class="cat-frame">
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:14px; padding:30px;">
        <div class="cover-logo">فود بوكس</div>
        <div class="cover-badge">
          <div class="title">كتالوج المنتجات</div>
          <div class="sub">PRODUCT CATALOG</div>
        </div>
        <div class="cover-company">${COMPANY_AR}</div>
        <div class="cover-company-sub">${COMPANY_SUB}</div>
      </div>
      <div class="cover-footer">📞 ${PHONE1} | ${PHONE2}</div>
    </div>
  </div>

  <!-- Brand index -->
  <div class="cat-page">
    <div class="cat-frame">
      <div class="brands-title">العلامات التجارية</div>
      <div class="brands-grid">${brandCards}</div>
    </div>
  </div>

  ${groupPages}

  <!-- Back -->
  <div class="cat-page">
    <div class="cat-frame dark" style="align-items:center; justify-content:center; text-align:center; padding:30px; gap:10px;">
      <div class="back-title">شكراً لاطلاعكم</div>
      <div class="back-sub">للطلب والاستفسار تواصل معنا</div>
      <div class="back-row">📱 مندوب عمان: +962${PHONE2}</div>
      <div class="back-row">📱 مندوب الزرقاء: +962${PHONE1}</div>
      <div class="back-copy">© 2026 ${COMPANY_AR}</div>
    </div>
  </div>
</body>
</html>`;
}

async function exportToPDF(groups: CatalogGroup[], brands: Brand[]) {
  const html = buildPrintHtml(groups, brands);

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
  type: 'cover' | 'brands' | 'grid' | 'back';
  group?: CatalogGroup;
  brands?: Brand[];
  pageNumber?: number;
  totalPages?: number;
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
  const { data: categories } = useCategories(true);
  const allProducts: Product[] = data?.data ?? [];

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: DARK, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={{ color: WHITE, marginTop: 16, fontSize: 14 }}>جاري تحميل الكتالوج...</Text>
      </View>
    );
  }

  return <CatalogBook products={allProducts} brands={brands ?? []} categories={categories ?? []} locale={locale} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOG BOOK
// ═══════════════════════════════════════════════════════════════════════════════

function CatalogBook({ products, brands, categories, locale }: {
  products: Product[]; brands: Brand[]; categories: Category[]; locale: string;
}) {
  const { width: winW, height: winH } = useWindowSize();
  const isDesktop = winW >= 900;
  const router = useRouter();
  const [exporting, setExporting] = useState(false);

  const groups = useMemo(() => buildCatalogGroups(products, brands, categories), [products, brands, categories]);

  const pages: PageData[] = useMemo(() => {
    const base: PageData[] = [
      { type: 'cover' },
      { type: 'brands', brands },
      ...groups.map((g): PageData => ({ type: 'grid', group: g })),
      { type: 'back' },
    ];
    return base.map((p, i) => ({ ...p, pageNumber: i + 1, totalPages: base.length }));
  }, [groups, brands]);

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

  const insets = useSafeAreaInsets();
  const bookW = isDesktop ? winW - 160 : winW;
  // On mobile: subtract toolbar, dots+indicator, and safe area insets
  const bookH = isDesktop ? Math.min(winH - 120, 820) : winH - 160 - insets.top;
  const pageW = isDesktop ? bookW / 2 : bookW;

  const [leftPage, rightPage] = spreads[spreadIdx];
  const currentPage = pages[pageIdx];
  const currentLabel = isDesktop
    ? `${spreadIdx * 2 + 1}–${Math.min(spreadIdx * 2 + 2, pages.length)}`
    : `${pageIdx + 1}`;

  async function handleExport() {
    setExporting(true);
    try {
      await exportToPDF(groups, brands);
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
        // Push content below the status bar
        paddingTop: Platform.OS === 'web' ? 'env(safe-area-inset-top, 8px)' as any : insets.top + 8,
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
  if (page.type === 'cover') return <CoverPage width={width} height={height} />;
  if (page.type === 'brands') return <BrandIndexPage brands={page.brands ?? []} width={width} height={height} />;
  if (page.type === 'back') return <BackPage width={width} height={height} />;
  if (page.type === 'grid' && page.group)
    return <GridPage group={page.group} locale={locale} pageNumber={page.pageNumber!} width={width} height={height} />;
  return <View style={{ flex: 1, backgroundColor: LIGHT }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COVER PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function CoverPage({ width, height }: { width: number; height: number }) {
  return (
    <View style={{ width, height, backgroundColor: PAGE_BG, overflow: 'hidden' }}>
      <View style={{
        flex: 1, margin: 8, borderWidth: 2, borderColor: ACCENT, borderRadius: 16,
        backgroundColor: WHITE, overflow: 'hidden',
      }}>
        <View style={{ position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: ACCENT + '10' }} />
        <View style={{ position: 'absolute', bottom: -80, left: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: DARK + '06' }} />

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 14 }}>
          <Image source={require('@/assets/logo.png')} style={{ width: 200, height: 80 }} contentFit="contain" />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: '80%' }}>
            <View style={{ flex: 1, height: 1.5, backgroundColor: ACCENT + '40' }} />
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: ACCENT }} />
            <View style={{ flex: 1, height: 1.5, backgroundColor: ACCENT + '40' }} />
          </View>

          <View style={{ backgroundColor: LIGHT, borderWidth: 1.5, borderColor: ACCENT + '55', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: ACCENT, textAlign: 'center', letterSpacing: 2 }}>كتالوج المنتجات</Text>
            <Text style={{ fontSize: 10, color: '#999', textAlign: 'center' }}>PRODUCT CATALOG</Text>
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

        <View style={{ backgroundColor: ACCENT, paddingVertical: 8, alignItems: 'center', gap: 2 }}>
          <Text style={{ color: WHITE, fontSize: 11, fontWeight: '700' }}>📞 {PHONE1}  |  {PHONE2}</Text>
          <Text style={{ color: WHITE + 'cc', fontSize: 9 }}>للطلب والاستفسار عبر واتساب</Text>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BRAND INDEX PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function BrandIndexPage({ brands, width, height }: { brands: Brand[]; width: number; height: number }) {
  return (
    <View style={{ width, height, backgroundColor: PAGE_BG }}>
      <View style={{
        flex: 1, margin: 8, borderWidth: 2, borderColor: ACCENT, borderRadius: 16,
        backgroundColor: WHITE, padding: 16,
      }}>
        <Text style={{ textAlign: 'center', fontSize: 14, fontWeight: '900', color: DARK, marginBottom: 12 }}>
          العلامات التجارية
        </Text>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'flex-start', gap: 10 }}
        >
          {brands.map((b) => (
            <View key={b.id} style={{
              width: '30%', aspectRatio: 1.6, borderRadius: 10, backgroundColor: LIGHT,
              alignItems: 'center', justifyContent: 'center', padding: 8,
              shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
            }}>
              {b.image_url ? (
                <Image source={{ uri: b.image_url }} style={{ width: '90%', height: '90%' }} contentFit="contain" />
              ) : (
                <Text style={{ fontSize: 11, fontWeight: '800', color: DARK, textAlign: 'center' }}>{b.name}</Text>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRID PAGE — several products per page, grouped by brand + category
// ═══════════════════════════════════════════════════════════════════════════════

function GridPage({ group, locale, pageNumber, width, height }: {
  group: CatalogGroup; locale: string; pageNumber: number; width: number; height: number;
}) {
  const cols = width > 420 ? 3 : 2;
  const widthPct = cardWidthPct(group.products.length, cols);
  const categoryLabel = group.category
    ? (locale === 'ar' ? group.category.name_ar : (group.category.name_en ?? group.category.name_ar))
    : OTHER_LABEL_AR;
  const brandName = group.brand?.name ?? OTHER_LABEL_AR;

  return (
    <View style={{ width, height, backgroundColor: PAGE_BG }}>
      <View style={{
        flex: 1, margin: 8, borderWidth: 2, borderColor: ACCENT, borderRadius: 16,
        backgroundColor: WHITE, overflow: 'hidden', flexDirection: 'row',
      }}>
        {/* Main content */}
        <View style={{ flex: 1 }}>
          {/* Brand header */}
          <View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 6, paddingHorizontal: 12 }}>
            {group.brand?.image_url ? (
              <Image source={{ uri: group.brand.image_url }} style={{ width: 120, height: 44 }} contentFit="contain" />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: '900', color: DARK }}>{brandName}</Text>
            )}
          </View>

          {/* Products grid — scrollable so it never clips on short/narrow viewports */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              flexDirection: 'row', flexWrap: 'wrap',
              alignContent: 'flex-start', justifyContent: 'center',
              paddingHorizontal: 10, gap: 8,
            }}
          >
            {group.products.map((p) => (
              <ProductCard key={p.id} product={p} widthPct={widthPct} />
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#eee',
          }}>
            <Image source={require('@/assets/logo.png')} style={{ width: 60, height: 22 }} contentFit="contain" />
            <Text style={{ fontSize: 9, color: '#888' }}>{COMPANY_AR}</Text>
          </View>
        </View>

        {/* Vertical category tab */}
        <View style={{ width: 26, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' }}>
          <Text
            numberOfLines={1}
            style={{
              color: WHITE, fontSize: 11, fontWeight: '800',
              transform: [{ rotate: '-90deg' }], width: height * 0.6,
              textAlign: 'center',
            }}
          >
            {categoryLabel}
          </Text>
        </View>
      </View>

      {/* Page number badge */}
      <View style={{
        position: 'absolute', bottom: 14, left: 14,
        width: 26, height: 26, borderRadius: 13, backgroundColor: ACCENT,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ color: WHITE, fontSize: 11, fontWeight: '900' }}>{pageNumber}</Text>
      </View>
    </View>
  );
}

function ProductCard({ product, widthPct }: { product: Product; widthPct: number }) {
  const imageUrl = product.product_images?.find((img) => img.is_primary)?.url
    ?? product.product_images?.[0]?.url;
  const hasStats = !!product.weight || !!product.pieces_per_carton;

  return (
    <View style={{
      width: `${widthPct}%`, borderWidth: 1.5, borderColor: ACCENT + '55',
      borderRadius: 10, backgroundColor: WHITE, padding: 6, marginBottom: 8,
    }}>
      <View style={{ aspectRatio: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: LIGHT, borderRadius: 8, overflow: 'hidden' }}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={{ width: '90%', height: '90%' }} contentFit="contain" />
        ) : (
          <Text style={{ fontSize: 22 }}>📦</Text>
        )}
      </View>
      <Text numberOfLines={2} style={{ fontSize: 10, fontWeight: '800', color: DARK, textAlign: 'center', marginTop: 4, minHeight: 26 }}>
        {product.name_ar}
      </Text>
      {hasStats && (
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eee', marginTop: 4, paddingTop: 4 }}>
          <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#eee' }}>
            <Text style={{ fontSize: 7, color: '#999' }}>الوزن</Text>
            <Text style={{ fontSize: 9, fontWeight: '800', color: DARK }}>
              {product.weight ? `${product.weight} ${product.weight_unit ?? 'كغ'}` : '—'}
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 7, color: '#999' }}>التعبئة</Text>
            <Text style={{ fontSize: 9, fontWeight: '800', color: DARK }}>
              {product.pieces_per_carton ?? '—'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BACK PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function BackPage({ width, height }: { width: number; height: number }) {
  return (
    <View style={{ width, height, backgroundColor: PAGE_BG }}>
      <View style={{
        flex: 1, margin: 8, borderWidth: 2, borderColor: ACCENT, borderRadius: 16,
        backgroundColor: DARK, alignItems: 'center', justifyContent: 'center', padding: 30, overflow: 'hidden',
      }}>
        <View style={{ position: 'absolute', top: -50, left: -50, width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: ACCENT + '30' }} />
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
              backgroundColor: ACCENT + '15', borderRadius: 12,
              paddingHorizontal: 20, paddingVertical: 10, width: '100%', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 16 }}>📱</Text>
              <Text style={{ fontSize: 13, color: WHITE, fontWeight: '600' }}>{label}: +962{phone}</Text>
            </View>
          ))}
        </View>

        <Text style={{ fontSize: 10, color: '#666', marginTop: 36 }}>© 2026 {COMPANY_AR} — جميع الحقوق محفوظة</Text>
      </View>
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
