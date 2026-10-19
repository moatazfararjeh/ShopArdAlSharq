import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, FlatList, Platform, I18nManager,
} from 'react-native';
import { ProductRowSkeleton, SectionHeaderSkeleton, BannerSkeleton } from '@/components/ui/Skeleton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useProducts, useProductsPage } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useBanners } from '@/hooks/useBanners';
import { useUnreadCount } from '@/hooks/useNotifications';
import { ProductCard } from '@/components/product/ProductCard';
import { GetProductsParams } from '@/services/productService';
import { getCurrentLocale } from '@/i18n';
import { getCategoryName, getBannerButtonText } from '@/types/models';
import { Product, Banner, Category } from '@/types/models';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useFavoriteIds, useFavoriteProducts } from '@/hooks/useFavorites';
import { useCartStore } from '@/stores/cartStore';
import { formatPrice } from '@/utils/formatPrice';
import { COLORS } from '@/lib/theme';
import { SideMenu } from '@/components/ui/SideMenu';
import { useBrands, useCategoryBrands } from '@/hooks/useBrands';
import { Brand } from '@/types/models';

// ─── Constants ────────────────────────────────────────────────────────────────
const BRAND     = COLORS.brandText;
const CARD_GAP  = 12;
const PAGE_SIZE = 24;
const SIDEBAR_W = 220;
const { width: SCREEN_W } = Dimensions.get('window');

function getBrowserWidth(): number {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.innerWidth) {
    return window.innerWidth;
  }
  return Dimensions.get('window').width;
}

// ─── Fallback banner ──────────────────────────────────────────────────────────
const FALLBACK_BANNER: Banner = {
  id: '__fallback__',
  title_ar: 'احصل على أول طلب\nبتوصيل مجاني!',
  title_en: 'Get your first order\nwith free delivery!',
  subtitle_ar: null, subtitle_en: null,
  label_ar: 'عرض خاص 🔥', label_en: 'Special Offer 🔥',
  button_text_ar: 'تسوق الآن', button_text_en: 'Shop Now',
  emoji: '🥘', image_url: null, bg_color: '#1e1a17',
  is_active: true, sort_order: 0, created_at: '',
  link_type: null, link_value: null,
};

// ─── Banner card ──────────────────────────────────────────────────────────────
function HeroBannerCard({
  banner, locale, onPress, width,
}: { banner: Banner; locale: string; onPress?: () => void; width: number }) {
  const buttonText = getBannerButtonText(banner, locale as any);
  const hasLink    = !!(banner.link_type && banner.link_value);
  const titleText  = locale === 'ar' ? banner.title_ar : (banner.title_en ?? banner.title_ar);
  const labelText  = locale === 'ar' ? banner.label_ar : (banner.label_en ?? banner.label_ar);

  return (
    <TouchableOpacity
      activeOpacity={hasLink ? 0.88 : 1}
      onPress={hasLink ? onPress : undefined}
      style={{
        width, height: 150, borderRadius: 20, overflow: 'hidden',
        backgroundColor: banner.bg_color ?? COLORS.ink,
      }}
    >
      {!!banner.image_url && (
        <>
          <Image
            source={{ uri: banner.image_url }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          {/* Keeps white text readable on any photo */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(28,25,23,0.38)' }} />
        </>
      )}

      <View style={{ flex: 1, justifyContent: 'center', padding: 18, gap: 6, alignItems: 'flex-start' }}>
        {!!labelText && (
          <View style={{ backgroundColor: COLORS.brand, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: COLORS.ink, fontSize: 11, fontWeight: '700' }}>{labelText}</Text>
          </View>
        )}
        {!!titleText && (
          <Text numberOfLines={2} style={{ color: '#fff', fontSize: 19, fontWeight: '700', lineHeight: 27 }}>
            {titleText}
          </Text>
        )}
        {!!buttonText && hasLink && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: '#F3D9CB', fontSize: 13, fontWeight: '600' }}>{buttonText}</Text>
            <Ionicons name="chevron-back" size={14} color="#F3D9CB" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Banner carousel ──────────────────────────────────────────────────────────
function HeroBannerCarousel({
  locale, bannerWidth, onCategorySelect,
}: { locale: string; bannerWidth: number; onCategorySelect: (id: string) => void }) {
  const router  = useRouter();
  const flatRef = useRef<FlatList<Banner>>(null);
  const { data: banners } = useBanners(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const list: Banner[] = banners && banners.length > 0 ? banners : [FALLBACK_BANNER];

  function handlePress(banner: Banner) {
    if (!banner.link_type || !banner.link_value) return;
    if (banner.link_type === 'product')       router.push(`/(public)/products/${banner.link_value}` as any);
    else if (banner.link_type === 'category') onCategorySelect(banner.link_value);
  }

  if (list.length === 1) {
    return (
      <View style={{ marginTop: 16, paddingHorizontal: 16 }}>
        <HeroBannerCard banner={list[0]} locale={locale} onPress={() => handlePress(list[0])} width={bannerWidth - 32} />
      </View>
    );
  }

  return (
    <View style={{ marginTop: 16 }}>
      <FlatList
        ref={flatRef}
        data={list}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={bannerWidth}
        decelerationRate="fast"
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => (
          <View style={{ width: bannerWidth, paddingHorizontal: 16 }}>
            <HeroBannerCard banner={item} locale={locale} onPress={() => handlePress(item)} width={bannerWidth - 32} />
          </View>
        )}
        onMomentumScrollEnd={(e) => {
          setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / bannerWidth));
        }}
      />
      {/* Dots — overlaid at bottom of banner */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 }}>
        {list.map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => { flatRef.current?.scrollToIndex({ index: i, animated: true }); setActiveIndex(i); }}
            style={{
              width: i === activeIndex ? 18 : 6,
              height: 6, borderRadius: 3,
              backgroundColor: i === activeIndex ? COLORS.ink : '#D9D2CA',
            }}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Category tile (4-column grid) ────────────────────────────────────────────
function CategoryCard({
  category, locale, onPress, size,
}: { category: Category; locale: string; onPress: () => void; size: number }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ alignItems: 'center', gap: 6, width: size }}>
      <View style={{
        width: size, height: size, borderRadius: 18,
        backgroundColor: COLORS.surface, overflow: 'hidden',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {category.image_url ? (
          <Image source={{ uri: category.image_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <Ionicons name="basket-outline" size={28} color={COLORS.muted} />
        )}
      </View>
      <Text numberOfLines={2} style={{ fontSize: 12, fontWeight: '500', color: COLORS.ink, textAlign: 'center', lineHeight: 16 }}>
        {getCategoryName(category, locale as any)}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Section header: title + "عرض الكل" ───────────────────────────────────────
function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, marginBottom: 12, direction: 'rtl' as any,
    }}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.ink }}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.brandText }}>عرض الكل</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Brand logo tile (home "الماركات" row) ────────────────────────────────────
function BrandTile({ brand, onPress }: { brand: Brand; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ alignItems: 'center', gap: 6, width: 76 }}>
      <View style={{
        width: 68, height: 68, borderRadius: 34, backgroundColor: '#fff',
        borderWidth: 1, borderColor: COLORS.line, overflow: 'hidden',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {brand.image_url
          ? <Image source={{ uri: brand.image_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel={brand.name} />
          : <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.brandText }}>{brand.name.charAt(0)}</Text>}
      </View>
      <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '500', color: COLORS.ink, textAlign: 'center' }}>{brand.name}</Text>
    </TouchableOpacity>
  );
}

// ─── Filter chip (category / brand rows in the product list) ──────────────────
function FilterChip({ label, active, onPress, image }: { label: string; active: boolean; onPress: () => void; image?: string | null }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        height: 38, borderRadius: 19, flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingStart: image ? 4 : 14, paddingEnd: 14,
        backgroundColor: active ? COLORS.ink : '#fff',
        borderWidth: 1, borderColor: active ? COLORS.ink : COLORS.line,
      }}
    >
      {!!image && (
        <Image source={{ uri: image }} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff' }} contentFit="cover" />
      )}
      <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? '#fff' : COLORS.ink }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Sort products: favorites first ───────────────────────────────────────────
function sortByFavorites(products: Product[], favIds: string[]): Product[] {
  if (!favIds.length) return products;
  const favSet = new Set(favIds);
  return [...products].sort((a, b) => {
    const aFav = favSet.has(a.id) ? 0 : 1;
    const bFav = favSet.has(b.id) ? 0 : 1;
    return aFav - bFav;
  });
}

/** Merge favorite products first, then remaining (deduped). Optionally filter by category. */
function mergeWithFavorites(products: Product[], favProducts: Product[], favIds: string[], categoryId?: string): Product[] {
  if (!favIds.length) return products;
  const favSet = new Set(favIds);
  // Filter favorites by category if specified, and only available ones
  let relevantFavs = favProducts.filter(p => p.is_available !== false);
  if (categoryId) {
    relevantFavs = relevantFavs.filter(p => p.category_id === categoryId);
  }
  // IDs already in products list
  const existingIds = new Set(products.map(p => p.id));
  // Favorites not yet in the list
  const missingFavs = relevantFavs.filter(p => !existingIds.has(p.id));
  // All favorites (already in list + missing)
  const allFavs = [...products.filter(p => favSet.has(p.id)), ...missingFavs];
  // Non-favorites from original list
  const nonFavs = products.filter(p => !favSet.has(p.id));
  return [...allFavs, ...nonFavs];
}

/** Stable-partition: in-stock products first, out-of-stock ones pushed to the end. */
function sortAvailableFirst(products: Product[]): Product[] {
  const inStock = products.filter(p => p.stock_quantity !== 0);
  const outOfStock = products.filter(p => p.stock_quantity === 0);
  return [...inStock, ...outOfStock];
}

// ─── All products grid (no category filter) ──────────────────────────────────
function AllProductsSection({ locale, cardWidth, onSeeAll }: { locale: string; cardWidth: number; onSeeAll: () => void }) {
  const router = useRouter();
  const { data: favIds } = useFavoriteIds();
  const { data: favProducts } = useFavoriteProducts();
  const { data, isLoading } = useProductsPage({
    availableOnly: true,
    sortBy: 'newest',
    limit: 60,
  });
  const rawProducts: Product[] = data?.data ?? [];
  const products = sortAvailableFirst(mergeWithFavorites(rawProducts, favProducts ?? [], favIds ?? [])).slice(0, 20);

  if (!isLoading && products.length === 0) return null;

  return (
    <View style={{ marginTop: 28, marginBottom: 16 }}>
      <SectionHeader title="وصل حديثاً" onSeeAll={onSeeAll} />

      {isLoading ? (
        <ProductRowSkeleton cardWidth={cardWidth} count={3} />
      ) : (
        <View style={{ direction: 'rtl' as any }}>
        <FlatList
          data={products}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 4 }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ width: cardWidth }}>
              <ProductCard product={item} onPress={() => router.push(`/(public)/products/${item.id}` as any)} />
            </View>
          )}
        />
        </View>
      )}
    </View>
  );
}

// ─── Today's Deals — discounted products horizontal strip ────────────────────
function DealsSection({ locale, cardWidth, onSeeAll }: { locale: string; cardWidth: number; onSeeAll?: () => void }) {
  const router = useRouter();
  const { data, isLoading } = useProductsPage({
    availableOnly: true,
    onDeal: true,
    sortBy: 'newest',
    limit: 30,
  });
  // discount_price < price is a data-integrity sanity check, not the primary
  // filter — that's now onDeal at the query level, so real deals outside the
  // cheapest-30-overall aren't silently dropped before this ever sees them.
  const products = (data?.data ?? [])
    .filter((p) => p.discount_price != null && p.discount_price > 0 && p.discount_price < p.price)
    .slice(0, 12);

  if (!isLoading && products.length === 0) return null;

  return (
    <View style={{ marginTop: 28 }}>
      <SectionHeader title="العروض" onSeeAll={onSeeAll} />

      {isLoading ? (
        <ProductRowSkeleton cardWidth={cardWidth} count={3} />
      ) : (
        <FlatList
          data={products}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ width: cardWidth }}>
              <ProductCard product={item} onPress={() => router.push(`/(public)/products/${item.id}` as any)} />
            </View>
          )}
        />
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Floating mini-cart bar ───────────────────────────────────────────────────
function MiniCartBar() {
  const router = useRouter();
  const itemCount = useCartStore((s) => s.summary.itemCount);
  const total     = useCartStore((s) => s.summary.total);

  if (itemCount === 0 || Platform.OS === 'web') return null;

  return (
    <TouchableOpacity
      onPress={() => router.push('/(customer)/cart')}
      activeOpacity={0.9}
      style={{
        position: 'absolute', bottom: Platform.OS === 'ios' ? 96 : 76, left: 16, right: 16,
        height: 56, backgroundColor: COLORS.ink, borderRadius: 16, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        shadowColor: COLORS.ink, shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25, shadowRadius: 16, elevation: 10,
        direction: 'rtl' as any,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{
          backgroundColor: COLORS.brand, borderRadius: 9, minWidth: 28, height: 28,
          alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
        }}>
          <Text style={{ color: COLORS.ink, fontSize: 14, fontWeight: '700' }}>{itemCount}</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>عرض السلة</Text>
      </View>
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{formatPrice(total)}</Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function HomeScreen() {
  const { t }       = useTranslation();
  const router      = useRouter();
  const locale      = getCurrentLocale();
  const unreadCount = useUnreadCount();
  const { data: favIds } = useFavoriteIds();
  const isWeb       = Platform.OS === 'web';

  const [windowWidth, setWindowWidth] = useState<number>(getBrowserWidth);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handler = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const [search, setSearch]                     = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedBrand, setSelectedBrand]       = useState<string | undefined>();
  const [showAllProducts, setShowAllProducts]   = useState(false);
  const [page, setPage]                         = useState(0);

  useEffect(() => { setPage(0); }, [search, selectedCategory, selectedBrand, showAllProducts]);

  const isDesktop  = windowWidth >= 768;
  const browseMode = showAllProducts || !!selectedCategory || !!selectedBrand || search.length >= 2;

  // Layout metrics
  const sidebarW      = isDesktop ? SIDEBAR_W : 0;
  const availW        = windowWidth - sidebarW - 32;
  const numCols       = isDesktop ? Math.max(2, Math.floor((availW + CARD_GAP) / (200 + CARD_GAP))) : 2;
  const browseCardW   = (availW - (numCols - 1) * CARD_GAP) / numCols;
  const discoverCardW = isDesktop ? 185 : 150;
  const bannerW       = isWeb ? windowWidth - sidebarW : windowWidth;

  const { data: categories } = useCategories();
  const selectedCategoryObj = categories?.find((c) => c.id === selectedCategory);
  // Brand filter: brands that sell in the selected category, or all brands
  const { data: allBrands }      = useBrands();
  const { data: categoryBrands } = useCategoryBrands(selectedCategory);
  const filterBrands: Brand[]    = (selectedCategory ? categoryBrands : allBrands) ?? [];

  function openCategory(id?: string) {
    setSelectedCategory(id);
    setSelectedBrand(undefined);   // a brand may not exist in the new category
    setShowAllProducts(true);      // stay in the list even for "الكل"
  }
  function openBrand(id?: string) {
    setSelectedBrand(id);
    setShowAllProducts(true);
  }
  function closeBrowse() {
    setShowAllProducts(false); setSelectedCategory(undefined); setSelectedBrand(undefined); setSearch('');
  }

  // Browse-mode queries
  const browseParams: GetProductsParams = {
    search: search.length >= 2 ? search : undefined,
    categoryId: selectedCategory,
    brandId: selectedBrand,
    availableOnly: true,
    sortBy: 'newest',
  };

  const {
    data: mobileInfiniteData, fetchNextPage, hasNextPage,
    isFetchingNextPage, isLoading: mobileLoading, isFetching: mobileFetching,
  } = useProducts(browseParams, { enabled: !isWeb && browseMode });

  const { data: webPageData, isLoading: webLoading, isFetching: webFetching } = useProductsPage(
    { ...browseParams, page, limit: PAGE_SIZE },
    { enabled: isWeb && browseMode },
  );

  const mobileProducts: Product[] = mobileInfiniteData?.pages.flatMap((p) => p.data) ?? [];
  const webProducts: Product[]    = webPageData?.data ?? [];
  const totalProducts              = webPageData?.count ?? 0;
  const totalPages                 = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE));

  // ── Browse header: title + category chips + brands of that category ────────
  function BrowseHeader() {
    const brandName = filterBrands.find((b) => b.id === selectedBrand)?.name;
    const label = search.length >= 2
      ? `"${search}"`
      : selectedCategoryObj
        ? getCategoryName(selectedCategoryObj, locale as any)
        : brandName ?? 'جميع المنتجات';
    return (
      <View style={{
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.line, paddingBottom: 10, direction: 'rtl' as any,
        // Web: the whole page scrolls inside CustomerWebLayout — keep the filters pinned
        ...(isWeb ? { position: 'sticky' as any, top: 0, zIndex: 10 } : {}),
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, gap: 10 }}>
          <TouchableOpacity
            onPress={closeBrowse}
            accessibilityLabel="رجوع"
            style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="arrow-forward" size={20} color={COLORS.ink} />
          </TouchableOpacity>
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.ink }}>{label}</Text>
        </View>

        {search.length < 2 && (
          <>
            {/* Category chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8, flexDirection: 'row' }}>
              <FilterChip label="الكل" active={!selectedCategory} onPress={() => openCategory(undefined)} />
              {(categories ?? []).map((c) => (
                <FilterChip key={c.id} label={getCategoryName(c, locale as any)} active={selectedCategory === c.id} onPress={() => openCategory(c.id)} />
              ))}
            </ScrollView>

            {/* Brands available in this category */}
            {filterBrands.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingTop: 8, flexDirection: 'row' }}>
                <FilterChip label="كل الماركات" active={!selectedBrand} onPress={() => openBrand(undefined)} />
                {filterBrands.map((b) => (
                  <FilterChip key={b.id} label={b.name} image={b.image_url} active={selectedBrand === b.id} onPress={() => openBrand(b.id)} />
                ))}
              </ScrollView>
            )}
          </>
        )}
      </View>
    );
  }

  // ── Discover content (home) ────────────────────────────────────────────────
  // Address state (hooks must be at top level, not inside conditionally-called functions)
  const { session } = useAuthStore();
  const [defaultAddress, setDefaultAddress] = useState<{ id: string; label: string; city: string } | null>(null);

  useFocusEffect(useCallback(() => {
    if (!session?.user?.id) return;
    supabase
      .from('addresses')
      .select('id, label, city')
      .eq('user_id', session.user.id)
      .eq('is_default', true)
      .maybeSingle()
      .then(({ data }) => {
        setDefaultAddress(data as any ?? null);
      });
  }, [session?.user?.id]));

  const [showAllCats, setShowAllCats] = useState(false);
  const [menuOpen, setMenuOpen]       = useState(false);

  function DiscoverContent() {
    // 4-column category grid: 7 categories + "more" tile, expandable to all
    const catTile  = (Math.min(windowWidth, 600) - 32 - 3 * 10) / 4;
    const allCats  = categories ?? [];
    const visCats  = showAllCats ? allCats : allCats.slice(0, 7);
    const hasMore  = allCats.length > 7;

    return (
      <ScrollView
        contentContainerStyle={{ paddingBottom: 170, backgroundColor: COLORS.canvas, direction: 'rtl' as any }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Banners */}
        <HeroBannerCarousel
          locale={locale}
          bannerWidth={bannerW}
          onCategorySelect={(id) => openCategory(id)}
        />

        {/* 2. Search — opens the full search screen */}
        <TouchableOpacity
          onPress={() => router.push('/(customer)/search' as any)}
          activeOpacity={0.8}
          accessibilityRole="search"
          style={{
            marginTop: 16, marginHorizontal: 16, height: 48, borderRadius: 14,
            backgroundColor: COLORS.surface, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14,
          }}
        >
          <Ionicons name="search-outline" size={20} color={COLORS.muted} />
          <Text style={{ flex: 1, fontSize: 15, color: COLORS.muted }}>{t('products.search')}</Text>
        </TouchableOpacity>

        {/* 3. Offers */}
        <DealsSection locale={locale} cardWidth={discoverCardW} onSeeAll={() => setShowAllProducts(true)} />

        {/* 4. Brands */}
        {(allBrands?.length ?? 0) > 0 && (
          <View style={{ marginTop: 28 }}>
            <SectionHeader title="الماركات" onSeeAll={() => router.push('/(customer)/brands' as any)} />
            {/* Two rows that scroll sideways together: each column holds 2 brands */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8, flexDirection: 'row' }}>
              {Array.from({ length: Math.ceil(allBrands!.length / 2) }, (_, col) => allBrands!.slice(col * 2, col * 2 + 2)).map((pair) => (
                <View key={pair[0].id} style={{ gap: 14 }}>
                  {pair.map((b) => (
                    <BrandTile key={b.id} brand={b} onPress={() => openBrand(b.id)} />
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 5. By category */}
        {allCats.length > 0 && (
          <View style={{ marginTop: 28 }}>
            <SectionHeader title="تسوّق حسب القسم" onSeeAll={() => openCategory(undefined)} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 14, paddingHorizontal: 16, direction: 'rtl' as any }}>
              {visCats.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  locale={locale}
                  size={catTile}
                  onPress={() => openCategory(category.id)}
                />
              ))}
              {hasMore && (
                <TouchableOpacity
                  onPress={() => setShowAllCats((v) => !v)}
                  activeOpacity={0.8}
                  style={{ alignItems: 'center', gap: 6, width: catTile }}
                >
                  <View style={{
                    width: catTile, height: catTile, borderRadius: 18,
                    backgroundColor: COLORS.brandTint, alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ionicons name={showAllCats ? 'chevron-up' : 'grid-outline'} size={26} color={COLORS.brandText} />
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.ink, textAlign: 'center' }}>
                    {showAllCats ? 'عرض أقل' : 'كل الأقسام'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* 6. New arrivals */}
        <AllProductsSection locale={locale} cardWidth={discoverCardW} onSeeAll={() => openCategory(undefined)} />
      </ScrollView>
    );
  }

  // ── Mobile browse ──────────────────────────────────────────────────────────
  function MobileBrowseContent() {
    return (
      <View style={{ flex: 1 }}>
        {mobileFetching && (
          <View style={{ position: 'absolute', top: 12, left: 0, right: 0, zIndex: 10, alignItems: 'center' }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 }}>
              <ActivityIndicator size="small" color={BRAND} />
            </View>
          </View>
        )}
        <FlatList
          data={mobileProducts}
          numColumns={2}
          columnWrapperStyle={{ gap: 10, paddingHorizontal: 12 }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={() => router.push(`/(public)/products/${item.id}` as any)} />
          )}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{ paddingBottom: 24, backgroundColor: COLORS.canvas, gap: 16, paddingTop: 10 }}
          ListFooterComponent={isFetchingNextPage ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}><ActivityIndicator color={BRAND} /></View>
          ) : hasNextPage ? (
            <TouchableOpacity
              onPress={() => fetchNextPage()}
              style={{ paddingVertical: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
            >
              <Text style={{ color: BRAND, fontWeight: '700', fontSize: 14 }}>تحميل المزيد</Text>
              <Ionicons name="chevron-down-circle-outline" size={20} color={BRAND} />
            </TouchableOpacity>
          ) : null}
          ListEmptyComponent={
            !mobileFetching ? (
              <View style={{ paddingTop: 60, alignItems: 'center', paddingHorizontal: 32 }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>🛍️</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#374151', textAlign: 'center' }}>{t('products.noProducts')}</Text>
              </View>
            ) : null
          }
        />
      </View>
    );
  }

  // ── Web browse ─────────────────────────────────────────────────────────────
  function WebBrowseContent() {
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 40, backgroundColor: COLORS.canvas }}>
        {webFetching && webProducts.length === 0 ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={BRAND} />
          </View>
        ) : webProducts.length === 0 ? (
          <View style={{ paddingTop: 60, alignItems: 'center', paddingHorizontal: 32 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🛍️</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#374151', textAlign: 'center' }}>{t('products.noProducts')}</Text>
          </View>
        ) : (
          <View style={{ opacity: webFetching ? 0.5 : 1 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP, rowGap: 20, paddingHorizontal: 16, paddingTop: 16 }}>
              {webProducts.map((item) => (
                <View key={item.id} style={{ width: browseCardW }}>
                  <ProductCard product={item} onPress={() => router.push(`/(public)/products/${item.id}` as any)} />
                </View>
              ))}
            </View>

            {/* Pagination */}
            {totalPages > 1 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 32 }}>
                <TouchableOpacity
                  onPress={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
                  disabled={page >= totalPages - 1}
                  style={[pgStyles.btn, page >= totalPages - 1 && pgStyles.btnDisabled]}
                >
                  <Ionicons name="chevron-back" size={16} color={page >= totalPages - 1 ? '#c9bfb6' : '#5c4a35'} />
                  <Text style={[pgStyles.btnText, page >= totalPages - 1 && pgStyles.btnTextDisabled]}>التالي</Text>
                </TouchableOpacity>

                {Array.from({ length: totalPages }, (_, i) => i)
                  .filter((i) => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 2)
                  .reduce<(number | '...')[]>((acc, i, idx, arr) => {
                    if (idx > 0 && (i as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                    acc.push(i);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === '...' ? (
                      <Text key={`ell-${idx}`} style={{ color: '#a09284', fontSize: 14, paddingHorizontal: 4 }}>…</Text>
                    ) : (
                      <TouchableOpacity
                        key={item}
                        onPress={() => setPage(item as number)}
                        style={[pgStyles.pageBtn, page === item && pgStyles.pageBtnActive]}
                      >
                        <Text style={[pgStyles.pageBtnText, page === item && pgStyles.pageBtnTextActive]}>
                          {(item as number) + 1}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}

                <TouchableOpacity
                  onPress={() => setPage((p) => Math.max(p - 1, 0))}
                  disabled={page === 0}
                  style={[pgStyles.btn, page === 0 && pgStyles.btnDisabled]}
                >
                  <Text style={[pgStyles.btnText, page === 0 && pgStyles.btnTextDisabled]}>السابق</Text>
                  <Ionicons name="chevron-forward" size={16} color={page === 0 ? '#c9bfb6' : '#5c4a35'} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    );
  }

  // ── Root ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.canvas, direction: 'rtl' as any }}>

      {/* Mobile header: delivery address + notifications, then search */}
      {!isWeb && (
        <View style={{ backgroundColor: COLORS.canvas, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, direction: 'rtl' as any }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <TouchableOpacity
              onPress={() => router.push('/(customer)/addresses' as any)}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}
            >
              <View style={{
                width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.brandTint,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="location-outline" size={21} color={COLORS.brandText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: COLORS.muted }}>التوصيل إلى</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: COLORS.ink, flexShrink: 1 }}>
                    {defaultAddress
                      ? [defaultAddress.label, defaultAddress.city].filter(Boolean).join(' — ')
                      : 'أضف عنوان التوصيل'}
                  </Text>
                  <Ionicons name="chevron-down" size={15} color={COLORS.ink} />
                </View>
              </View>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => router.push('/(customer)/notifications' as any)}
                accessibilityLabel="الإشعارات"
                style={{
                  width: 44, height: 44, borderRadius: 14,
                  borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.canvas,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name="notifications-outline" size={22} color={COLORS.ink} />
                {unreadCount > 0 && (
                  <View style={{
                    position: 'absolute', top: 6, left: 6,
                    minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3,
                    backgroundColor: COLORS.brandFill, alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1.5, borderColor: '#fff',
                  }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMenuOpen(true)}
                accessibilityLabel="القائمة"
                style={{
                  width: 44, height: 44, borderRadius: 14,
                  borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.canvas,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name="menu" size={24} color={COLORS.ink} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Browse header */}
      {browseMode && BrowseHeader()}

      {/* Content */}
      {browseMode
        ? isWeb ? WebBrowseContent() : MobileBrowseContent()
        : DiscoverContent()
      }

      {/* ── Floating mini-cart bar ── */}
      <MiniCartBar />

      {/* Burger menu (native only — web has its own drawer in CustomerWebLayout) */}
      {!isWeb && <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />}
    </SafeAreaView>
  );
}

// ─── Pagination styles ────────────────────────────────────────────────────────
const pgStyles = {
  btn: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    gap: 4, paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 10, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e6e0d8', cursor: 'pointer' as any,
  },
  btnDisabled:      { opacity: 0.4, cursor: 'default' as any },
  btnText:          { fontSize: 14, fontWeight: '600' as const, color: '#5c4a35' },
  btnTextDisabled:  { color: '#c9bfb6' },
  pageBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6e0d8', cursor: 'pointer' as any,
  },
  pageBtnActive:     { backgroundColor: BRAND, borderColor: BRAND },
  pageBtnText:       { fontSize: 14, fontWeight: '600' as const, color: '#5c4a35' },
  pageBtnTextActive: { color: '#fff' },
};
