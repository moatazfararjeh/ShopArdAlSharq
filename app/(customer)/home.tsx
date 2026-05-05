import { useState, useRef } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, FlatList as RNFlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useProducts } from '@/hooks/useProducts';
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

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = getCurrentLocale();
  const unreadCount = useUnreadCount();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);

  const params: GetProductsParams = {
    search: search.length >= 2 ? search : undefined,
    categoryId: selectedCategory,
    availableOnly: true,
    sortBy: 'newest',
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useProducts(params);
  const { data: categories } = useCategories();

  const products: Product[] = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f7f5' }}>
      {/* Header — white, clean */}
      <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          {/* Search bar */}
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

          {/* Notification bell */}
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
                  alignItems: 'center', justifyContent: 'center',
                  paddingHorizontal: 3,
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

      <FlatList
        data={products}
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
        ListHeaderComponent={
          <>
            {/* Hero banner */}
            <HeroBanner locale={locale} onCategorySelect={(id) => setSelectedCategory(id)} />

            {/* Categories section */}
            {categories && categories.length > 0 && (
              <View style={{ marginTop: 20, marginBottom: 4 }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
                  style={{ transform: [{ scaleX: -1 }] }}
                >
                  {/* Wrap each item with scaleX:-1 to un-flip content */}
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setSelectedCategory(cat.id === selectedCategory ? undefined : cat.id)}
                      style={{
                        paddingHorizontal: 20, paddingVertical: 9, borderRadius: 24,
                        backgroundColor: selectedCategory === cat.id ? '#1c1917' : '#ede8e1',
                        borderWidth: 0,
                        transform: [{ scaleX: -1 }],
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: selectedCategory === cat.id ? '#fff' : '#857d78' }}>
                        {getCategoryName(cat, locale)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {/* All pill — last in JSX = rightmost visually in RTL */}
                  <TouchableOpacity
                    onPress={() => setSelectedCategory(undefined)}
                    style={{
                      paddingHorizontal: 20, paddingVertical: 9, borderRadius: 24,
                      backgroundColor: !selectedCategory ? '#1c1917' : '#ede8e1',
                      borderWidth: 0,
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

            {/* Products section header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 22, marginBottom: 6 }}>
              {products.length > 0 && (
                <TouchableOpacity>
                  <Text style={{ fontSize: 13, color: '#e36523', fontWeight: '600' }}>
                    {t('categories.seeAll', { defaultValue: 'عرض الكل' })}
                  </Text>
                </TouchableOpacity>
              )}
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#1c1917' }}>
                {selectedCategory
                  ? t('products.categoryProducts', { defaultValue: 'المنتجات' })
                  : t('products.allProducts')}
              </Text>
            </View>
          </>
        }
        ListFooterComponent={isFetchingNextPage ? (
          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
            <ActivityIndicator color="#e36523" />
          </View>
        ) : null}
        ListEmptyComponent={
          isLoading ? (
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
    </SafeAreaView>
  );
}
