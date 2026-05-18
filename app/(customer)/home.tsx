import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, FlatList as RNFlatList, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useProducts, useProductsPage } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useBanners } from '@/hooks/useBanners';
import { useUnreadCount } from '@/hooks/useNotifications';
import { ProductCard } from '@/components/product/ProductCard';
import { GetProductsParams } from '@/services/productService';
import { getCurrentLocale } from '@/i18n';
import { getCategoryName, getBannerButtonText } from '@/types/models';
import { Product, Banner } from '@/types/models';
import { Image } from 'expo-image';

// Fallback shown when no active banners exist in DB
const FALLBACK_BANNER: Banner = {
  id: '__fallback__',
  title_ar: 'احصل على أول طلب\nبتوصيل مجاني!',
  title_en: 'Get your first order\nwith free delivery!',
  subtitle_ar: null,
  subtitle_en: null,
  label_ar: 'عرض خاص 🔥',
  label_en: 'Special Offer 🔥',
  button_text_ar: 'تسوق الآن',
  button_text_en: 'Shop Now',
  emoji: '🥘',
  image_url: null,
  bg_color: '#1e1a17',
  is_active: true,
  sort_order: 0,
  created_at: '',
  link_type: null,
  link_value: null,
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 32; // 16px margin each side

function HeroBannerCard({ banner, locale, onPress }: { banner: Banner; locale: string; onPress?: () => void }) {
  const buttonText = getBannerButtonText(banner, locale as any);
  const bg = banner.bg_color ?? '#8B7355';
  const hasImage = !!banner.image_url;
  const hasLink = !!(banner.link_type && banner.link_value);

  return (
    <TouchableOpacity
      activeOpacity={hasLink ? 0.88 : 1}
      onPress={hasLink ? onPress : undefined}
      style={{
        width: BANNER_WIDTH,
        marginHorizontal: 16, marginTop: 12, marginBottom: 4,
        borderRadius: 20, overflow: 'hidden',
        backgroundColor: bg,
        height: 180,
      }}
    >
      {hasImage && (
        <Image
          source={{ uri: banner.image_url! }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
        />
      )}
      {buttonText ? (
        <View style={{ position: 'absolute', bottom: 16, right: 22 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 8 }}>
            <Text style={{ color: '#111827', fontSize: 13, fontWeight: '700' }}>{buttonText}</Text>
          </View>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function HeroBanner({ locale, onCategorySelect }: { locale: string; onCategorySelect: (categoryId: string) => void }) {
  const router = useRouter();
  const { data: banners } = useBanners(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<RNFlatList>(null);

  const list: Banner[] = banners && banners.length > 0 ? banners : [FALLBACK_BANNER];

  function handleBannerPress(banner: Banner) {
    if (!banner.link_type || !banner.link_value) return;
    if (banner.link_type === 'product') {
      router.push(`/(public)/products/${banner.link_value}` as any);
    } else if (banner.link_type === 'category') {
      onCategorySelect(banner.link_value);
    }
  }

  if (list.length === 1) {
    return <HeroBannerCard banner={list[0]} locale={locale} onPress={() => handleBannerPress(list[0])} />;
  }

  return (
    <View style={{ marginTop: 12, marginBottom: 4 }}>
      <RNFlatList
        ref={flatRef}
        data={list}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={BANNER_WIDTH + 32}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 0 }}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => (
          <HeroBannerCard banner={item} locale={locale} onPress={() => handleBannerPress(item)} />
        )}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / (BANNER_WIDTH + 32));
          setActiveIndex(idx);
        }}
      />
      {/* Dots indicator */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 }}>
        {list.map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => {
              flatRef.current?.scrollToIndex({ index: i, animated: true });
              setActiveIndex(i);
            }}
            style={{
              width: i === activeIndex ? 18 : 6,
              height: 6, borderRadius: 3,
              backgroundColor: i === activeIndex ? '#e36523' : '#d1c9bf',
            }}
          />
        ))}
      </View>
    </View>
  );
}

const WEB_PAGE_SIZE = 24;
const SIDEBAR_WIDTH = 220;
const CONTENT_PADDING = 32;
const CARD_GAP = 12;

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = getCurrentLocale();
  const unreadCount = useUnreadCount();
  const { width: windowWidth } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);

  // Reset to first page whenever filters change
  useEffect(() => { setPage(0); }, [search, selectedCategory]);

  const params: GetProductsParams = {
    search: search.length >= 2 ? search : undefined,
    categoryId: selectedCategory,
    availableOnly: true,
    sortBy: 'newest',
  };

  // Mobile: infinite scroll (disabled on web)
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: mobileLoading } =
    useProducts(params, { enabled: !isWeb });

  // Web: single-page query
  const { data: webPageData, isLoading: webLoading } = useProductsPage(
    { ...params, page, limit: WEB_PAGE_SIZE },
  );

  const { data: categories } = useCategories();

  const mobileProducts: Product[] = data?.pages.flatMap((p) => p.data) ?? [];
  const webProducts: Product[]    = webPageData?.data ?? [];
  const totalProducts              = webPageData?.count ?? 0;
  const totalPages                 = Math.max(1, Math.ceil(totalProducts / WEB_PAGE_SIZE));

  // Web grid column calculation
  const availWidth = windowWidth - SIDEBAR_WIDTH - CONTENT_PADDING;
  const numCols    = Math.max(2, Math.floor((availWidth + CARD_GAP) / (200 + CARD_GAP)));
  const cardWidth  = (availWidth - (numCols - 1) * CARD_GAP) / numCols;

  // Shared header content (banner + categories + section title)
  function renderListHeader() {
    return (
      <>
        {/* Delivery coverage notice */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          gap: 6, marginHorizontal: 16, marginTop: 10, marginBottom: 2,
          backgroundColor: '#fff7f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
          borderWidth: 1, borderColor: '#fde0c8',
        }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#c2410c' }}>
            🚚 التوصيل يغطي منطقتي عمان و الزرقاء
          </Text>
        </View>

        {/* Hero banner */}
        <HeroBanner locale={locale} onCategorySelect={(id) => setSelectedCategory(id)} />

        {/* Categories */}
        {categories && categories.length > 0 && (
          <View style={{ marginTop: 20, marginBottom: 4 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
              style={{ transform: [{ scaleX: -1 }] }}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id === selectedCategory ? undefined : cat.id)}
                  style={{
                    paddingHorizontal: 20, paddingVertical: 9, borderRadius: 24,
                    backgroundColor: selectedCategory === cat.id ? '#1c1917' : '#ede8e1',
                    transform: [{ scaleX: -1 }],
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: selectedCategory === cat.id ? '#fff' : '#857d78' }}>
                    {getCategoryName(cat, locale)}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setSelectedCategory(undefined)}
                style={{
                  paddingHorizontal: 20, paddingVertical: 9, borderRadius: 24,
                  backgroundColor: !selectedCategory ? '#1c1917' : '#ede8e1',
                  transform: [{ scaleX: -1 }],
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: !selectedCategory ? '#fff' : '#857d78' }}>
                  {t('categories.allCategories')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Section title */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 22, marginBottom: 6 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#1c1917' }}>
            {selectedCategory
              ? t('products.categoryProducts', { defaultValue: 'المنتجات' })
              : t('products.allProducts')}
          </Text>
        </View>
      </>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f7f5' }}>

      {/* ── Mobile header (search + notifications) — hidden on web ── */}
      {!isWeb && (
        <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <View style={{
              flex: 1, flexDirection: 'row', alignItems: 'center',
              backgroundColor: '#f3f4f6',
              borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, gap: 8,
              borderWidth: 1, borderColor: '#e6e0d8',
            }}>
              {search.length > 0 ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={17} color="#9ca3af" />
                </TouchableOpacity>
              ) : null}
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={t('products.search')}
                style={{ flex: 1, fontSize: 14, color: '#111827', textAlign: 'right' }}
                placeholderTextColor="#9ca3af"
              />
              <Ionicons name="search-outline" size={17} color="#9ca3af" />
            </View>
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
                    backgroundColor: '#e36523',
                    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
                  }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Web search bar ── */}
      {isWeb && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e6e0d8' }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: '#f3f4f6', borderRadius: 14,
            paddingHorizontal: 14, paddingVertical: 10, gap: 8,
            borderWidth: 1, borderColor: '#e6e0d8', maxWidth: 480,
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
        </View>
      )}

      {/* ── Mobile FlatList (infinite scroll) ── */}
      {!isWeb && (
        <FlatList
          data={mobileProducts}
          numColumns={2}
          columnWrapperStyle={{ gap: 10, paddingHorizontal: 12 }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => router.push(`/(public)/products/${item.id}`)}
            />
          )}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{ paddingBottom: 24, backgroundColor: '#f9f7f5', gap: 10, paddingTop: 10 }}
          ListHeaderComponent={renderListHeader()}
          ListFooterComponent={isFetchingNextPage ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator color="#e36523" />
            </View>
          ) : null}
          ListEmptyComponent={
            mobileLoading ? (
              <View style={{ paddingTop: 60, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#e36523" />
              </View>
            ) : (
              <View style={{ paddingTop: 60, alignItems: 'center', paddingHorizontal: 32 }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>🛍️</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#374151', textAlign: 'center' }}>{t('products.noProducts')}</Text>
              </View>
            )
          }
        />
      )}

      {/* ── Web product grid + pagination ── */}
      {isWeb && (
        <ScrollView contentContainerStyle={{ paddingBottom: 40, backgroundColor: '#f9f7f5' }}>
          {renderListHeader()}

          {/* Loading state */}
          {webLoading ? (
            <View style={{ paddingTop: 60, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#e36523" />
            </View>
          ) : webProducts.length === 0 ? (
            <View style={{ paddingTop: 60, alignItems: 'center', paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🛍️</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#374151', textAlign: 'center' }}>{t('products.noProducts')}</Text>
            </View>
          ) : (
            <>
              {/* Product grid */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP, paddingHorizontal: 16, paddingTop: 4 }}>
                {webProducts.map((item) => (
                  <View key={item.id} style={{ width: cardWidth }}>
                    <ProductCard
                      product={item}
                      onPress={() => router.push(`/(public)/products/${item.id}`)}
                    />
                  </View>
                ))}
              </View>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 32 }}>
                  {/* Next (right in Arabic = next page direction) */}
                  <TouchableOpacity
                    onPress={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
                    disabled={page >= totalPages - 1}
                    style={[paginationStyles.btn, page >= totalPages - 1 && paginationStyles.btnDisabled]}
                  >
                    <Ionicons name="chevron-back" size={16} color={page >= totalPages - 1 ? '#c9bfb6' : '#5c4a35'} />
                    <Text style={[paginationStyles.btnText, page >= totalPages - 1 && paginationStyles.btnTextDisabled]}>التالي</Text>
                  </TouchableOpacity>

                  {/* Page numbers (show up to 7 around current page) */}
                  {Array.from({ length: totalPages }, (_, i) => i)
                    .filter((i) => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 2)
                    .reduce<(number | '...')[]>((acc, i, idx, arr) => {
                      if (idx > 0 && (i as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                      acc.push(i);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === '...' ? (
                        <Text key={`ellipsis-${idx}`} style={{ color: '#a09284', fontSize: 14, paddingHorizontal: 4 }}>…</Text>
                      ) : (
                        <TouchableOpacity
                          key={item}
                          onPress={() => setPage(item as number)}
                          style={[paginationStyles.pageBtn, page === item && paginationStyles.pageBtnActive]}
                        >
                          <Text style={[paginationStyles.pageBtnText, page === item && paginationStyles.pageBtnTextActive]}>
                            {(item as number) + 1}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}

                  {/* Previous */}
                  <TouchableOpacity
                    onPress={() => setPage((p) => Math.max(p - 1, 0))}
                    disabled={page === 0}
                    style={[paginationStyles.btn, page === 0 && paginationStyles.btnDisabled]}
                  >
                    <Text style={[paginationStyles.btnText, page === 0 && paginationStyles.btnTextDisabled]}>السابق</Text>
                    <Ionicons name="chevron-forward" size={16} color={page === 0 ? '#c9bfb6' : '#5c4a35'} />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

    </SafeAreaView>
  );
}

const paginationStyles = {
  btn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6e0d8',
    cursor: 'pointer' as any,
  },
  btnDisabled: {
    opacity: 0.4,
    cursor: 'default' as any,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#5c4a35',
  },
  btnTextDisabled: {
    color: '#c9bfb6',
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6e0d8',
    cursor: 'pointer' as any,
  },
  pageBtnActive: {
    backgroundColor: '#e36523',
    borderColor: '#e36523',
  },
  pageBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#5c4a35',
  },
  pageBtnTextActive: {
    color: '#fff',
  },
};
