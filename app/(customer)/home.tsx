import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, FlatList, Platform, I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useProducts, useProductsPage } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useBrands } from '@/hooks/useBrands';
import { useBanners } from '@/hooks/useBanners';
import { useUnreadCount } from '@/hooks/useNotifications';
import { ProductCard } from '@/components/product/ProductCard';
import { GetProductsParams } from '@/services/productService';
import { getCurrentLocale } from '@/i18n';
import { getCategoryName, getBannerButtonText } from '@/types/models';
import { Product, Banner, Category, Brand } from '@/types/models';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useFavoriteIds, useFavoriteProducts } from '@/hooks/useFavorites';

// ─── Constants ────────────────────────────────────────────────────────────────
const BRAND     = '#e36523';
const CARD_GAP  = 12;
const PAGE_SIZE = 24;
const SIDEBAR_W = 220;
const { width: SCREEN_W } = Dimensions.get('window');

function getBrowserWidth(): number {
  if (typeof window !== 'undefined') return window.innerWidth;
  return SCREEN_W;
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
  return (
    <TouchableOpacity
      activeOpacity={hasLink ? 0.88 : 1}
      onPress={hasLink ? onPress : undefined}
      style={{ width, borderRadius: 0, overflow: 'hidden', backgroundColor: banner.bg_color ?? '#8B7355', height: 180 }}
    >
      {banner.image_url && (
        <Image source={{ uri: banner.image_url }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} contentFit="cover" />
      )}
      {buttonText && (
        <View style={{ position: 'absolute', bottom: 16, right: 22 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 8 }}>
            <Text style={{ color: '#111827', fontSize: 13, fontWeight: '700' }}>{buttonText}</Text>
          </View>
        </View>
      )}
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
      <View style={{ marginVertical: 12 }}>
        <HeroBannerCard banner={list[0]} locale={locale} onPress={() => handlePress(list[0])} width={bannerWidth} />
      </View>
    );
  }

  return (
    <View style={{ marginVertical: 12 }}>
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
          <HeroBannerCard banner={item} locale={locale} onPress={() => handlePress(item)} width={bannerWidth} />
        )}
        onMomentumScrollEnd={(e) => {
          setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / bannerWidth));
        }}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 }}>
        {list.map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => { flatRef.current?.scrollToIndex({ index: i, animated: true }); setActiveIndex(i); }}
            style={{ width: i === activeIndex ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === activeIndex ? BRAND : '#d1c9bf' }}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Category circle card ─────────────────────────────────────────────────────
function CategoryCard({
  category, locale, onPress,
}: { category: Category; locale: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ alignItems: 'center', gap: 7, width: 80 }}>
      <View style={{
        width: 68, height: 68, borderRadius: 34,
        backgroundColor: '#f5f0eb',
        overflow: 'hidden',
        borderWidth: 1.5, borderColor: '#e6e0d8',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {category.image_url ? (
          <Image source={{ uri: category.image_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <Text style={{ fontSize: 28 }}>🛒</Text>
        )}
      </View>
      <Text numberOfLines={2} style={{
        fontSize: 11, fontWeight: '600', color: '#1c1917',
        textAlign: 'center', lineHeight: 15,
      }}>
        {getCategoryName(category, locale as any)}
      </Text>
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

/** Merge favorite products first, then remaining (deduped). Optionally filter by category or brand. */
function mergeWithFavorites(products: Product[], favProducts: Product[], favIds: string[], categoryId?: string, brandId?: string): Product[] {
  if (!favIds.length) return products;
  const favSet = new Set(favIds);
  // Filter favorites by category/brand if specified, and only available ones
  let relevantFavs = favProducts.filter(p => p.is_available !== false);
  if (categoryId) {
    relevantFavs = relevantFavs.filter(p => p.category_id === categoryId);
  }
  if (brandId) {
    relevantFavs = relevantFavs.filter(p => p.brand_id === brandId);
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

// ─── Per-category horizontal product row ──────────────────────────────────────
function CategoryProductsSection({
  category, locale, cardWidth, onSeeAll,
}: { category: Category; locale: string; cardWidth: number; onSeeAll: () => void }) {
  const router = useRouter();
  const { data: favIds } = useFavoriteIds();
  const { data: favProducts } = useFavoriteProducts();
  const { data, isLoading } = useProductsPage({
    categoryId: category.id,
    limit: 10,
    availableOnly: true,
    sortBy: 'newest',
  });
  const products = mergeWithFavorites(data?.data ?? [], favProducts ?? [], favIds ?? [], category.id);

  if (!isLoading && products.length === 0) return null;

  return (
    <View style={{ marginBottom: 28 }}>
      {/* Section header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, marginBottom: 10, direction: 'rtl' as any,
      }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: '#1c1917' }}>
          {getCategoryName(category, locale as any)}
        </Text>
        <TouchableOpacity onPress={onSeeAll} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text style={{ fontSize: 13, color: BRAND, fontWeight: '600' }}>رؤية الكل</Text>
          <Ionicons name="chevron-forward" size={13} color={BRAND} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ height: 210, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={BRAND} />
        </View>
      ) : (
        <View style={{ direction: 'rtl' as any }}>
        <FlatList
          data={products}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
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

// ─── Per-brand horizontal product row ─────────────────────────────────────────
function BrandProductsSection({
  brand, locale, cardWidth,
}: { brand: Brand; locale: string; cardWidth: number }) {
  const router = useRouter();
  const { data: favIds } = useFavoriteIds();
  const { data: favProducts } = useFavoriteProducts();
  const { data, isLoading } = useProductsPage({
    brandId: brand.id,
    limit: 10,
    availableOnly: true,
    sortBy: 'newest',
  });
  const products = mergeWithFavorites(data?.data ?? [], favProducts ?? [], favIds ?? [], undefined, brand.id);

  if (!isLoading && products.length === 0) return null;

  return (
    <View style={{ marginBottom: 28 }}>
      {/* Section header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, marginBottom: 10, direction: 'rtl' as any,
      }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: '#1c1917' }}>
          {brand.name}
        </Text>
      </View>

      {isLoading ? (
        <View style={{ height: 210, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={BRAND} />
        </View>
      ) : (
        <View style={{ direction: 'rtl' as any }}>
        <FlatList
          data={products}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
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

// ─── Products without brand (أخرى) ───────────────────────────────────────────
function NoBrandProductsSection({ locale, cardWidth }: { locale: string; cardWidth: number }) {
  const router = useRouter();
  const { data: favIds } = useFavoriteIds();
  const { data: favProducts } = useFavoriteProducts();
  const { data, isLoading } = useProductsPage({
    noBrand: true,
    limit: 10,
    availableOnly: true,
    sortBy: 'newest',
  });
  const products = mergeWithFavorites(data?.data ?? [], favProducts ?? [], favIds ?? []);

  if (!isLoading && products.length === 0) return null;

  return (
    <View style={{ marginBottom: 28 }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, marginBottom: 10, direction: 'rtl' as any,
      }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: '#1c1917' }}>أخرى</Text>
      </View>

      {isLoading ? (
        <View style={{ height: 210, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={BRAND} />
        </View>
      ) : (
        <View style={{ direction: 'rtl' as any }}>
        <FlatList
          data={products}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
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

// ─── All products grid (no category filter) ──────────────────────────────────
function AllProductsSection({ locale, cardWidth, onSeeAll }: { locale: string; cardWidth: number; onSeeAll: () => void }) {
  const router = useRouter();
  const { data: favIds } = useFavoriteIds();
  const { data: favProducts } = useFavoriteProducts();
  const { data, isLoading } = useProductsPage({
    availableOnly: true,
    sortBy: 'newest',
    limit: 20,
  });
  const rawProducts: Product[] = data?.data ?? [];
  const products = mergeWithFavorites(rawProducts, favProducts ?? [], favIds ?? []);

  if (!isLoading && products.length === 0) return null;

  return (
    <View style={{ marginTop: 24, marginBottom: 28 }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, marginBottom: 14,
        direction: 'rtl' as any,
      }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#1c1917' }}>جميع المنتجات</Text>
        <TouchableOpacity onPress={onSeeAll} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text style={{ fontSize: 13, color: BRAND, fontWeight: '600' }}>رؤية الكل</Text>
          <Ionicons name="chevron-forward" size={13} color={BRAND} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ height: 210, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={BRAND} />
        </View>
      ) : (
        <View style={{ direction: 'rtl' as any }}>
        <FlatList
          data={products}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
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

// ═══════════════════════════════════════════════════════════════════════════════
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
    if (typeof window === 'undefined') return;
    const handler = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const [search, setSearch]                     = useState('');
  const [selectedBrand, setSelectedBrand]       = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [page, setPage]                         = useState(0);

  useEffect(() => { setPage(0); }, [search, selectedBrand, selectedCategory]);

  const isDesktop  = windowWidth >= 768;
  const isAllProducts = selectedBrand === '__all__';
  const browseMode = !!selectedBrand || !!selectedCategory || search.length >= 2;

  // Layout metrics
  const sidebarW      = isDesktop ? SIDEBAR_W : 0;
  const availW        = windowWidth - sidebarW - 32;
  const numCols       = isDesktop ? Math.max(2, Math.floor((availW + CARD_GAP) / (200 + CARD_GAP))) : 2;
  const browseCardW   = (availW - (numCols - 1) * CARD_GAP) / numCols;
  const discoverCardW = isDesktop ? 185 : 150;
  const bannerW       = isWeb ? windowWidth - sidebarW : SCREEN_W;

  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const selectedBrandObj = brands?.find((b) => b.id === selectedBrand);
  const selectedCategoryObj = categories?.find((c) => c.id === selectedCategory);

  // Browse-mode queries
  const browseParams: GetProductsParams = {
    search: search.length >= 2 ? search : undefined,
    brandId: isAllProducts ? undefined : selectedBrand,
    categoryId: selectedCategory,
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

  // ── Search bar ─────────────────────────────────────────────────────────────
  function SearchBar({ maxWidth }: { maxWidth?: number }) {
    return (
      <View style={{
        flex: maxWidth ? undefined : 1, maxWidth,
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#f3f4f6', borderRadius: 14,
        paddingHorizontal: 14, paddingVertical: 11, gap: 8,
        borderWidth: 1, borderColor: '#e6e0d8',
      }}>
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={17} color="#9ca3af" />
          </TouchableOpacity>
        )}
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('products.search')}
          style={{ flex: 1, fontSize: 14, color: '#111827', textAlign: 'right' } as any}
          placeholderTextColor="#9ca3af"
        />
        <Ionicons name="search-outline" size={17} color="#9ca3af" />
      </View>
    );
  }

  // ── Browse header ──────────────────────────────────────────────────────────
  function BrowseHeader() {
    const label = isAllProducts
      ? 'جميع المنتجات'
      : selectedCategoryObj
        ? getCategoryName(selectedCategoryObj, locale as any)
        : selectedBrandObj
          ? selectedBrandObj.name
          : search.length >= 2 ? `"${search}"` : '';
    return (
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 10,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e6e0d8', gap: 10,
      }}>
        <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: '#1c1917', textAlign: 'right' }}>
          {label}
        </Text>
        <TouchableOpacity
          onPress={() => { setSelectedBrand(undefined); setSelectedCategory(undefined); setSearch(''); }}
          style={{ padding: 6, borderRadius: 10, backgroundColor: '#f5f0eb' }}
        >
          <Ionicons name="arrow-forward" size={20} color="#5c4a35" />
        </TouchableOpacity>
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

  function DiscoverContent() {
    return (
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40, backgroundColor: '#f8f7f5', direction: 'rtl' as any }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero banner image — hidden for now */}
        {/* <Image
          source={require('@/assets/hero-banner.png')}
          style={{ width: '100%', aspectRatio: 1080 / 600 }}
          contentFit="cover"
        /> */}

        {/* Delivery address selector */}
        <TouchableOpacity
          onPress={() => {
            if (defaultAddress) {
              router.push('/(customer)/addresses' as any);
            } else {
              router.push('/(customer)/edit-address' as any);
            }
          }}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row', alignItems: 'center',
            gap: 8, marginHorizontal: 16, marginTop: 10, marginBottom: 4,
            backgroundColor: defaultAddress ? '#fff' : '#fff7f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
            borderWidth: 1, borderColor: defaultAddress ? '#e6e0d8' : '#fde0c8',
          }}
        >
          <Ionicons name="location" size={18} color={BRAND} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: '#6b7280' }}>توصيل إلى</Text>
            <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700', color: defaultAddress ? '#1c1917' : '#c2410c' }}>
              {defaultAddress ? `${defaultAddress.label} - ${defaultAddress.city}` : 'أضف عنوان توصيل'}
            </Text>
          </View>
          {defaultAddress ? (
            <Ionicons name="chevron-down" size={16} color="#6b7280" />
          ) : (
            <Ionicons name="add-circle" size={20} color={BRAND} />
          )}
        </TouchableOpacity>

        {/* Banners */}
        <HeroBannerCarousel
          locale={locale}
          bannerWidth={bannerW}
          onCategorySelect={setSelectedBrand}
        />


        {/* الأقسام — brand circles */}
        {brands && brands.length > 0 && (
          <>
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start',
              paddingHorizontal: 16, marginTop: 20, marginBottom: 14,
              direction: 'rtl' as any,
            }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#1c1917' }}>الأقسام</Text>
            </View>

            <View style={{ direction: 'rtl' as any }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 6, paddingBottom: 4 }}
            >
              {/* All products icon */}
              <TouchableOpacity onPress={() => { setSelectedBrand('__all__'); }} activeOpacity={0.8} style={{ alignItems: 'center', gap: 7, width: 80 }}>
                <View style={{
                  width: 68, height: 68, borderRadius: 34,
                  backgroundColor: '#fff7ed',
                  overflow: 'hidden',
                  borderWidth: 1.5, borderColor: BRAND,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="grid" size={28} color={BRAND} />
                </View>
                <Text numberOfLines={2} style={{
                  fontSize: 11, fontWeight: '600', color: '#1c1917',
                  textAlign: 'center', lineHeight: 15,
                }}>
                  جميع المنتجات
                </Text>
              </TouchableOpacity>
              {brands.map((brand) => (
                <TouchableOpacity
                  key={brand.id}
                  onPress={() => setSelectedBrand(brand.id)}
                  activeOpacity={0.8}
                  style={{ alignItems: 'center', gap: 7, width: 80 }}
                >
                  <View style={{
                    width: 68, height: 68, borderRadius: 34,
                    backgroundColor: '#f5f0eb',
                    overflow: 'hidden',
                    borderWidth: 1.5, borderColor: '#e6e0d8',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {brand.image_url ? (
                      <Image source={{ uri: brand.image_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#1c1917', textAlign: 'center', paddingHorizontal: 4 }} numberOfLines={2}>
                        {brand.name}
                      </Text>
                    )}
                  </View>
                  <Text numberOfLines={2} style={{
                    fontSize: 11, fontWeight: '600', color: '#1c1917',
                    textAlign: 'center', lineHeight: 15,
                  }}>
                    {brand.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            </View>
          </>
        )}

        {/* الفئات — category circles */}
        {categories && categories.length > 0 && (
          <>
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start',
              paddingHorizontal: 16, marginTop: 20, marginBottom: 14,
              direction: 'rtl' as any,
            }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#1c1917' }}>الفئات</Text>
            </View>

            <View style={{ direction: 'rtl' as any }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 6, paddingBottom: 4 }}
            >
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  locale={locale}
                  onPress={() => setSelectedCategory(category.id)}
                />
              ))}
            </ScrollView>
            </View>
          </>
        )}

        {/* Product section per brand */}
        {brands?.map((brand) => (
          <BrandProductsSection
            key={brand.id}
            brand={brand}
            locale={locale}
            cardWidth={discoverCardW}
          />
        ))}

        {/* Products without brand — أخرى */}
        <NoBrandProductsSection locale={locale} cardWidth={discoverCardW} />

        {/* All products section (no category filter) */}
        <AllProductsSection locale={locale} cardWidth={discoverCardW} onSeeAll={() => setSelectedBrand('__all__')} />
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
          contentContainerStyle={{ paddingBottom: 24, backgroundColor: '#f8f7f5', gap: 16, paddingTop: 10 }}
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
      <ScrollView contentContainerStyle={{ paddingBottom: 40, backgroundColor: '#f8f7f5' }}>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f7f5', direction: 'rtl' as any }}>

      {/* Mobile header */}
      {!isWeb && (
        <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, direction: 'rtl' as any }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {SearchBar({})}
            <TouchableOpacity
              onPress={() => router.push('/(customer)/notifications' as any)}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#ede8e1', alignItems: 'center', justifyContent: 'center' }}
            >
              <View style={{ position: 'relative' }}>
                <Ionicons name="notifications-outline" size={22} color="#1c1917" />
                {unreadCount > 0 && (
                  <View style={{
                    position: 'absolute', top: -3, right: -4,
                    minWidth: 16, height: 16, borderRadius: 8,
                    backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
                  }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Web search bar */}
      {isWeb && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e6e0d8' }}>
          {SearchBar({ maxWidth: 480 })}
        </View>
      )}

      {/* Browse header */}
      {browseMode && BrowseHeader()}

      {/* Content */}
      {browseMode
        ? isWeb ? WebBrowseContent() : MobileBrowseContent()
        : DiscoverContent()
      }
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
