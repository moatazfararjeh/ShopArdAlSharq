import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, Dimensions, TouchableOpacity,
  ActivityIndicator, PanResponder,
} from 'react-native';

import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useCategories } from '@/hooks/useCategories';
import { useBrands } from '@/hooks/useBrands';
import { useProductsPage } from '@/hooks/useProducts';
import { getCurrentLocale } from '@/i18n';
import { getCategoryName, getProductName, Product, Category, Brand } from '@/types/models';
import { formatPrice } from '@/utils/formatPrice';

// ── Design constants matching the professional catalog look ───────────────────
const ITEMS_PER_PAGE = 6; // 3 columns × 2 rows per page
const HEADER_COLOR = '#1a3a6b'; // Dark blue header like the reference
const ACCENT = '#e36523';
const DARK = '#1c1917';

function useWindowSize() {
  const [size, setSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : Dimensions.get('window').width,
    height: typeof window !== 'undefined' ? window.innerHeight : Dimensions.get('window').height,
  }));

  useEffect(() => {
    if (typeof window === 'undefined') {
      const sub = Dimensions.addEventListener('change', ({ window: w }) => {
        setSize({ width: w.width, height: w.height });
      });
      return () => sub.remove();
    }
    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

export default function CatalogScreen() {
  const locale = getCurrentLocale();
  const { data: brands, isLoading: brandsLoading } = useBrands(true);

  if (brandsLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#2c2c2c', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#2c2c2c' }}>
      <BookView brands={brands ?? []} locale={locale} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOOK VIEW
// ═══════════════════════════════════════════════════════════════════════════════

interface PageData {
  type: 'cover' | 'content' | 'back';
  products?: Product[];
  brand?: Brand;
  pageNumber?: number;
  totalBrandPages?: number;
  globalPageNumber?: number;
}

function BookView({ brands, locale }: { brands: Brand[]; locale: string }) {
  const { data, isLoading } = useProductsPage(
    { availableOnly: true, limit: 2000 },
    { enabled: true },
  );

  const allProducts: Product[] = data?.data ?? [];

  // Build pages: cover, then each brand's products chunked into pages, then back
  const pages = useMemo(() => {
    const result: PageData[] = [];
    result.push({ type: 'cover' });

    let globalNum = 1;
    for (const brand of brands) {
      const brandProducts = allProducts.filter((p) => p.brand_id === brand.id);
      if (brandProducts.length === 0) continue;
      const chunks = chunkArray(brandProducts, ITEMS_PER_PAGE);
      chunks.forEach((chunk, i) => {
        result.push({
          type: 'content',
          products: chunk,
          brand: brand,
          pageNumber: i + 1,
          totalBrandPages: chunks.length,
          globalPageNumber: globalNum++,
        });
      });
    }

      // Products without brand — أخرى
      const noBrandProducts = allProducts.filter((p) => !p.brand_id);
      if (noBrandProducts.length > 0) {
        const otherBrand: Brand = { id: '__other__', name: 'أخرى', is_active: true, sort_order: 9999, created_at: '' };
        const chunks = chunkArray(noBrandProducts, ITEMS_PER_PAGE);
        chunks.forEach((chunk, i) => {
          result.push({
            type: 'content',
            products: chunk,
            brand: otherBrand,
            pageNumber: i + 1,
            totalBrandPages: chunks.length,
            globalPageNumber: globalNum++,
          });
        });
      }

      result.push({ type: 'back' });
      return result;
    }, [brands, allProducts]);

  // Spreads = pairs of pages (left + right of the open book)
  const spreads = useMemo(() => {
    const result: [PageData, PageData | null][] = [];
    for (let i = 0; i < pages.length; i += 2) {
      result.push([pages[i], pages[i + 1] ?? null]);
    }
    return result;
  }, [pages]);

  const [spreadIdx, setSpreadIdx] = useState(0);
  const [pageIdx, setPageIdx] = useState(0);
  const { width: winW, height: winH } = useWindowSize();
  const isDesktop = winW >= 900;

  const canPrev = isDesktop ? spreadIdx > 0 : pageIdx > 0;
  const canNext = isDesktop ? spreadIdx < spreads.length - 1 : pageIdx < pages.length - 1;

  // Swipe gesture for mobile navigation
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return !isDesktop && Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        const SWIPE_THRESHOLD = 50;
        if (gestureState.dx > SWIPE_THRESHOLD) {
          setPageIdx((s) => Math.max(0, s - 1));
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          setPageIdx((s) => Math.min(pages.length - 1, s + 1));
        }
      },
    })
  ).current;

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  const [leftPage, rightPage] = spreads[spreadIdx];
  const currentPage = pages[pageIdx]; // For mobile single-page view

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: isDesktop ? 10 : 0 }}>
      {/* Book + Navigation */}
      <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
        {/* Open book */}
        <View
          {...(!isDesktop ? panResponder.panHandlers : {})}
          style={{
            width: isDesktop ? winW - 160 : winW,
            height: isDesktop ? undefined : winH - 100,
            flex: isDesktop ? 1 : undefined,
            flexDirection: isDesktop ? 'row' : 'column',
            borderRadius: isDesktop ? 4 : 0,
            overflow: 'hidden',
            backgroundColor: '#fff',
            // Shadow for book depth
            shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: 10 },
            elevation: 16,
          }}>
          {/* Spine divider */}
          {isDesktop && (
            <View style={{
              position: 'absolute', top: 0, bottom: 0, left: '50%',
              width: 6, marginLeft: -3, zIndex: 20,
              backgroundColor: '#d4d0cc',
              shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: -2, height: 0 },
            }} />
          )}

          {isDesktop ? (
            <>
              {/* Left page */}
              <View style={{ flex: 1 }}>
                <CatalogPage page={leftPage} locale={locale} side="right" />
              </View>
              {/* Right page */}
              <View style={{ flex: 1 }}>
                {rightPage ? (
                  <CatalogPage page={rightPage} locale={locale} side="left" />
                ) : (
                  <View style={{ flex: 1, backgroundColor: '#fafafa' }} />
                )}
              </View>
            </>
          ) : (
            /* Mobile: single page view */
            <View style={{ flex: 1 }}>
              <CatalogPage page={currentPage} locale={locale} side="right" />
            </View>
          )}

          {/* Overlay navigation arrows */}
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', pointerEvents: 'box-none' }}>
            <NavBtn icon="chevron-back" onPress={() => isDesktop ? setSpreadIdx((s) => s + 1) : setPageIdx((s) => s + 1)} onLongPress={() => isDesktop ? setSpreadIdx(spreads.length - 1) : setPageIdx(pages.length - 1)} disabled={!canNext} side="left" />
            <NavBtn icon="chevron-forward" onPress={() => isDesktop ? setSpreadIdx((s) => s - 1) : setPageIdx((s) => s - 1)} onLongPress={() => isDesktop ? setSpreadIdx(0) : setPageIdx(0)} disabled={!canPrev} side="right" />
          </View>
        </View>
      </View>

      {/* Bottom controls */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 18 }}>
        <Text style={{ color: '#999', fontSize: 12 }}>
          {isDesktop ? `${spreadIdx * 2 + 1}–${Math.min(spreadIdx * 2 + 2, pages.length)}` : `${pageIdx + 1}`} / {pages.length} صفحة
        </Text>
      </View>

      {/* Dots */}
      <View style={{ flexDirection: 'row', gap: 5, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 320 }}>
        {isDesktop ? spreads.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => setSpreadIdx(i)}>
            <View style={{
              width: spreadIdx === i ? 18 : 7, height: 7, borderRadius: 4,
              backgroundColor: spreadIdx === i ? ACCENT : '#555',
            }} />
          </TouchableOpacity>
        )) : pages.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => setPageIdx(i)}>
            <View style={{
              width: pageIdx === i ? 18 : 7, height: 7, borderRadius: 4,
              backgroundColor: pageIdx === i ? ACCENT : '#555',
            }} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOG PAGE — renders based on page type
// ═══════════════════════════════════════════════════════════════════════════════

function CatalogPage({ page, locale, side }: { page: PageData; locale: string; side: 'left' | 'right' }) {
  if (page.type === 'cover') return <CoverPage locale={locale} />;
  if (page.type === 'back') return <BackPage />;
  return <ContentPage page={page} locale={locale} side={side} />;
}

// ── Cover Page ───────────────────────────────────────────────────────────────

function CoverPage({ locale }: { locale: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: HEADER_COLOR }}>
      {/* Decorative diagonal stripes */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: -80, right: -100, width: 350, height: 350, borderRadius: 175, backgroundColor: 'rgba(255,255,255,0.03)' }} />
        <View style={{ position: 'absolute', bottom: -60, left: -80, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(255,255,255,0.02)' }} />
        {/* Gold diagonal accent */}
        <View style={{ position: 'absolute', top: '20%', right: -20, width: 8, height: '60%', backgroundColor: '#c9a96e', transform: [{ rotate: '15deg' }] }} />
        <View style={{ position: 'absolute', top: '18%', right: -4, width: 3, height: '60%', backgroundColor: '#c9a96e55', transform: [{ rotate: '15deg' }] }} />
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
        {/* Top label */}
        {/* Logo area */}
   

        <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center' }}>
          شركة أرض الشرق الحديثة
        </Text>
        <Text style={{ fontSize: 11, color: '#aaa', marginTop: 6, textAlign: 'center' }}>
          لتوزيع المواد الغذائية
        </Text>
      </View>
    </View>
  );
}

// ── Content Page (products grid) ─────────────────────────────────────────────

function ContentPage({ page, locale, side }: { page: PageData; locale: string; side: 'left' | 'right' }) {
  const products = page.products ?? [];
  const brand = page.brand!;
  const { width: winW } = useWindowSize();
  const isDesktop = winW >= 900;
  const cols = isDesktop ? 3 : 2;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header bar — blue like the reference */}
      <View style={{
        backgroundColor: HEADER_COLOR,
        paddingVertical: 10, paddingHorizontal: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        direction: 'rtl' as any,
      }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: '#c9a96e' }}>
          {brand.name}
        </Text>
        <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }} numberOfLines={1}>
          شركة أرض الشرق الحديثة لتوزيع المواد الغذائية
        </Text>
      </View>

      {/* Products Grid */}
      <View
        style={{
          flex: 1,
          flexDirection: 'row', flexWrap: 'wrap',
          padding: 6, gap: 6,
          direction: 'rtl' as any,
          alignContent: 'flex-start',
        }}
      >
        {products.map((product) => (
          <ProductCard key={product.id} product={product} locale={locale} cols={cols} totalItems={products.length} />
        ))}
      </View>

      {/* Page footer */}
      <View style={{
        paddingVertical: 8, paddingHorizontal: 14,
        borderTopWidth: 1, borderTopColor: '#eee',
        direction: 'rtl' as any,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <View style={{ width: 30, height: 3, backgroundColor: HEADER_COLOR, borderRadius: 2 }} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: HEADER_COLOR }}>
            {page.globalPageNumber}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="call-outline" size={9} color="#666" />
            <Text style={{ fontSize: 8, color: '#666' }}>0795277537</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="call-outline" size={9} color="#666" />
            <Text style={{ fontSize: 8, color: '#666' }}>0792881832</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Product Card — matches the reference catalog style ───────────────────────

function ProductCard({ product, locale, cols, totalItems }: { product: Product; locale: string; cols: number; totalItems: number }) {
  const imageUrl = product.product_images?.find((img) => img.is_primary)?.url
    ?? product.product_images?.[0]?.url;

  const unitLabel = getUnitLabel(product);
  const sizeLabel = getSizeLabel(product);

  // Calculate width based on columns
  const widthPercent = cols === 3 ? '31.5%' : '48%';
  // Always use max rows (based on ITEMS_PER_PAGE) so page size stays constant
  const maxRows = Math.ceil(ITEMS_PER_PAGE / cols);
  const heightPercent = `${Math.floor(100 / maxRows) - 2}%`;

  return (
    <View style={{
      width: widthPercent as any,
      height: heightPercent as any,
      backgroundColor: '#fff',
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#e8e4e0',
      overflow: 'hidden',
      direction: 'rtl' as any,
    }}>
      {/* Product image */}
      <View style={{
        width: '100%', flex: 1,
        backgroundColor: '#f8f7f5',
        alignItems: 'center', justifyContent: 'center',
        padding: 4,
      }}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
        ) : (
          <Ionicons name="cube-outline" size={30} color="#ddd" />
        )}
      </View>

      {/* Product name */}
      <View style={{ paddingHorizontal: 6, paddingTop: 6, paddingBottom: 4, direction: 'rtl' as any }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: DARK, textAlign: 'center' }} numberOfLines={2}>
          {getProductName(product, locale as any)}
        </Text>
        {product.name_en && locale === 'ar' && (
          <Text style={{ fontSize: 8, color: '#888', textAlign: 'center', marginTop: 1 }} numberOfLines={1}>
            {product.name_en}
          </Text>
        )}
      </View>

      {/* Details table — like the reference image */}
      <View style={{ paddingHorizontal: 5, paddingBottom: 6, marginTop: 4, direction: 'rtl' as any }}>
        {/* Unit row */}
        <DetailRow label="الوحدة" value={unitLabel ?? '—'} color="#0369a1" />
        {/* Size/weight row */}
        <DetailRow label="الحجم" value={sizeLabel} color={ACCENT} />
        {/* Sell unit row */}
        {product.pieces_per_carton && (
          <DetailRow label="الكرتون" value={`${product.pieces_per_carton} حبة`} color="#7c3aed" />
        )}
        {/* Price row */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: HEADER_COLOR + '0C', paddingHorizontal: 5, paddingVertical: 3,
          borderRadius: 3, marginTop: 3,
        }}>
          <Text style={{ fontSize: 8, fontWeight: '600', color: '#666' }}>السعر</Text>
          <Text style={{ fontSize: 10, fontWeight: '800', color: ACCENT }}>
            {product.discount_price ? formatPrice(product.discount_price) : formatPrice(product.price)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 5, paddingVertical: 2,
      borderBottomWidth: 0.5, borderBottomColor: '#f0ece8',
    }}>
      <Text style={{ fontSize: 8, color: '#888' }}>{label}</Text>
      <View style={{ backgroundColor: color + '12', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 }}>
        <Text style={{ fontSize: 8, fontWeight: '700', color }}>{value}</Text>
      </View>
    </View>
  );
}

// ── Back Page ────────────────────────────────────────────────────────────────

function BackPage() {
  return (
    <View style={{ flex: 1, backgroundColor: HEADER_COLOR, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
      <View style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }} />


      <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 6 }}>
        شكراً لاطلاعكم
      </Text>
      <Text style={{ fontSize: 11, color: '#aab', textAlign: 'center', marginBottom: 20 }}>
        للطلب والاستفسار تواصل معنا
      </Text>

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
          <Text style={{ fontSize: 12, color: '#e0e0e0' }}>مندوب عمان: +962795277537</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
          <Text style={{ fontSize: 12, color: '#e0e0e0' }}>مندوب الزرقاء: +962792881832</Text>
        </View>
      </View>

      <Text style={{ fontSize: 9, color: '#556', marginTop: 30 }}>© 2026 شركة أرض الشرق الحديثة - جميع الحقوق محفوظة</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAV BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

function NavBtn({ icon, onPress, onLongPress, disabled, side }: { icon: any; onPress: () => void; onLongPress?: () => void; disabled: boolean; side: 'left' | 'right' }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      style={{
        width: 40, height: 90,
        borderTopLeftRadius: side === 'left' ? 0 : 45,
        borderBottomLeftRadius: side === 'left' ? 0 : 45,
        borderTopRightRadius: side === 'right' ? 0 : 45,
        borderBottomRightRadius: side === 'right' ? 0 : 45,
        backgroundColor: disabled ? 'rgba(0,0,0,0.2)' : 'rgba(255,200,130,0.6)',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={28} color={disabled ? 'rgba(255,255,255,0.4)' : '#fff'} />
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

function getUnitLabel(product: Product): string | null {
  switch (product.unit_type) {
    case 'piece': return 'حبة';
    case 'kg': return 'كيلو';
    case 'carton': return 'كرتون';
    default: return null;
  }
}

function getSizeLabel(product: Product): string {
  if (product.weight) {
    return `${product.weight} ${product.weight_unit ?? 'كغ'}`;
  }
  return '—';
}
