import {
  View, Text, ScrollView, TouchableOpacity, Dimensions,
  FlatList, ActivityIndicator, Animated, Easing, Platform, Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProduct, useProductsPage } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';
import { useToastStore } from '@/stores/toastStore';
import { getCurrentLocale } from '@/i18n';
import { getProductName, getProductDescription, getMinOrderQuantity, hasDiscount } from '@/types/models';
import { formatPrice, getDiscountPercent } from '@/utils/formatPrice';
import { ProductCard } from '@/components/product/ProductCard';
import { useFavoriteIds, useToggleFavorite } from '@/hooks/useFavorites';
import { useAuthStore } from '@/stores/authStore';
import { useRecordProductEvent } from '@/hooks/useAnalytics';
import { useStockAlertStatus, useToggleStockAlert } from '@/hooks/useStockAlerts';
import { COLORS } from '@/lib/theme';
import Head from 'expo-router/head';

// ─── Flash Sale Countdown ─────────────────────────────────────────────────────
function useCountdown(endsAt: string | null | undefined) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!endsAt) { setRemaining(''); return; }

    function tick() {
      const diff = new Date(endsAt!).getTime() - Date.now();
      if (diff <= 0) { setRemaining(''); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setRemaining(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return remaining;
}

// ─── Back-in-Stock Alert Button ───────────────────────────────────────────────
function StockAlertButton({ productId }: { productId: string }) {
  const { session } = useAuthStore();
  const { data: isSubscribed, isLoading } = useStockAlertStatus(productId);
  const toggle = useToggleStockAlert(productId);
  const showToast = useToastStore((s) => s.show);

  if (!session) return null;

  function handlePress() {
    const next = !isSubscribed;
    toggle.mutate(next, {
      onSuccess: () => showToast(next ? 'سنُخطرك عند توفر المنتج 🔔' : 'تم إلغاء الإشعار'),
    });
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isLoading || toggle.isPending}
      activeOpacity={0.8}
      style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderRadius: 14, height: 52,
        borderWidth: 1,
        borderColor: isSubscribed ? COLORS.line : COLORS.brandFill,
        backgroundColor: isSubscribed ? COLORS.surface : COLORS.brandTint,
      }}
    >
      <Ionicons name={isSubscribed ? 'notifications-off-outline' : 'notifications-outline'} size={20} color={isSubscribed ? COLORS.muted : COLORS.brandText} />
      <Text style={{ fontSize: 15, fontWeight: '700', color: isSubscribed ? COLORS.muted : COLORS.brandText }}>
        {isSubscribed ? 'إلغاء الإشعار' : 'أعلمني عند التوفر'}
      </Text>
    </TouchableOpacity>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BRAND = COLORS.brandText;

// Top-bar icon buttons: white with a hairline border so they read both over the
// photo and on the solid white bar that fades in on scroll.
const TOP_BTN = {
  width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff',
  borderWidth: 1, borderColor: COLORS.line,
  alignItems: 'center' as const, justifyContent: 'center' as const,
};
const BAR_H = 60;            // top bar height (below the status bar)
const GALLERY_FADE_AT = 200; // scroll offset where the bar turns solid

// ─── Image gallery ─────────────────────────────────────────────────────────────
function ImageGallery({
  images,
  discounted,
  originalPrice,
  discountPrice,
  alt,
}: {
  images: { id: string; url: string }[];
  alt: string;
  discounted: boolean;
  originalPrice: number;
  discountPrice?: number;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList<any>>(null);
  const imgs = images.length > 0 ? images : [{ id: '__placeholder__', url: '' }];

  return (
    <View style={{ backgroundColor: COLORS.surface, paddingBottom: 32 }}>
      {/* Main swipeable image */}
      <FlatList
        ref={flatRef}
        data={imgs}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_WIDTH, height: 300, paddingTop: 56, alignItems: 'center', justifyContent: 'center' }}>
            <Image
              source={{ uri: item.url }}
              accessibilityLabel={alt}
              style={{ width: SCREEN_WIDTH * 0.7, height: 230 }}
              contentFit="contain"
            />
          </View>
        )}
        onMomentumScrollEnd={(e) =>
          setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))
        }
      />

      {/* Discount badge */}
      {discounted && discountPrice != null && (
        <View style={{
          position: 'absolute', bottom: 40, right: 16,
          backgroundColor: COLORS.green, borderRadius: 8,
          paddingHorizontal: 8, paddingVertical: 3,
        }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
            −{getDiscountPercent(originalPrice, discountPrice)}%
          </Text>
        </View>
      )}

      {/* Dot pagination */}
      {imgs.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 4 }}>
          {imgs.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                flatRef.current?.scrollToIndex({ index: i, animated: true });
                setActiveIndex(i);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
              style={{
                width: i === activeIndex ? 18 : 6, height: 6, borderRadius: 3,
                backgroundColor: i === activeIndex ? COLORS.ink : '#D9D2CA',
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Wishlist button ──────────────────────────────────────────────────────────
function WishlistButton({ productId }: { productId: string }) {
  const { session } = useAuthStore();
  const { data: favIds } = useFavoriteIds();
  const toggleFav = useToggleFavorite();
  const recordEvent = useRecordProductEvent();
  const isFav = favIds?.includes(productId) ?? false;
  const scale = useRef(new Animated.Value(1)).current;
  const showToast = useToastStore((s) => s.show);

  function toggle() {
    if (!session?.user?.id) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.35, duration: 120, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    toggleFav.mutate({ productId, isFavorited: isFav });
    showToast(isFav ? 'أُزيل من المفضلة' : 'أُضيف إلى المفضلة');
    if (!isFav) {
      recordEvent.mutate({ productId, eventType: 'wishlist', userId: session.user.id });
    }
  }

  if (!session) return null;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={toggle}
        accessibilityLabel={isFav ? 'إزالة من المفضلة' : 'أضف للمفضلة'}
        style={TOP_BTN}
        activeOpacity={0.75}
      >
        <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={21} color={isFav ? COLORS.danger : COLORS.ink} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Share button ─────────────────────────────────────────────────────────────
function ShareButton({ productId, productName }: { productId: string; productName: string }) {
  const recordEvent = useRecordProductEvent();
  const { session } = useAuthStore();
  const showToast = useToastStore((s) => s.show);

  async function handleShare() {
    const url = Platform.OS === 'web'
      ? window.location.href
      : `ardalsharq://products/${productId}`;

    recordEvent.mutate({
      productId,
      eventType: 'share',
      userId: session?.user?.id ?? undefined,
    });

    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({ title: productName, url });
        } else {
          await navigator.clipboard.writeText(url);
          showToast('تم نسخ رابط المنتج');
        }
      } else {
        await Share.share({
          title: productName,
          message: `${productName}\n${url}`,
        });
      }
    } catch (_) {
      // User cancelled — event already recorded
    }
  }

  return (
    <TouchableOpacity
      onPress={handleShare}
      accessibilityLabel="مشاركة"
      style={TOP_BTN}
      activeOpacity={0.75}
    >
      <Ionicons name="share-social-outline" size={21} color={COLORS.ink} />
    </TouchableOpacity>
  );
}

// ─── Animated add-to-cart button ──────────────────────────────────────────────
function AddToCartButton({
  onPress, outOfStock, disabled, totalPrice,
}: { onPress: () => void; outOfStock: boolean; disabled?: boolean; totalPrice: string }) {
  const [added, setAdded] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  function handlePress() {
    if (outOfStock || disabled) return;
    onPress();
    setAdded(true);
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={outOfStock || !!disabled}
        activeOpacity={0.85}
        style={{
          backgroundColor: outOfStock ? '#D9D2CA' : added ? COLORS.green : COLORS.brandFill,
          borderRadius: 14, height: 52, paddingHorizontal: 16,
          alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
          {outOfStock ? 'نفدت الكمية' : added ? 'تمت الإضافة ✓' : 'أضف للسلة'}
        </Text>
        {!outOfStock && !added && (
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{totalPrice}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: product, isLoading, error } = useProduct(id ?? '');
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(customer)/home');
  }
  const locale = getCurrentLocale();
  const { addItem } = useCart();
  const showToast = useToastStore((s) => s.show);
  const [quantity, setQuantity] = useState(1);
  const minQty = product ? getMinOrderQuantity(product) : 1;
  const orderQty = Math.max(quantity, minQty);
  const [selectedUnit, setSelectedUnit] = useState<'piece' | 'kg' | 'carton' | null>(null);
  const recordEvent = useRecordProductEvent();
  const userId = useAuthStore((s) => s.profile?.id);
  const scrollY = useRef(new Animated.Value(0)).current;
  // Opened from a shared link / notification → no history, so offer Home instead of Back
  const hasHistory = router.canGoBack();

  // Flash sale — must be computed before early returns so useCountdown is always called
  const flashActive    = !!product?.flash_sale_price && !!product?.flash_sale_ends_at &&
                         new Date(product.flash_sale_ends_at) > new Date();
  const flashCountdown = useCountdown(flashActive ? product?.flash_sale_ends_at : null);

  // Track product view
  useEffect(() => {
    if (id) {
      recordEvent.mutate({ productId: id, eventType: 'view', userId });
    }
  }, [id]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <Text style={{ color: '#ef4444' }}>{t('errors.notFound')}</Text>
      </View>
    );
  }

  const name        = getProductName(product, locale);
  const description = getProductDescription(product, locale);
  const discounted  = hasDiscount(product);
  const images      = product.images?.length ? product.images : (product.product_images ?? []);
  const outOfStock  = product.stock_quantity === 0;

  // Unit options
  const unitOptions: { unit: 'piece' | 'kg' | 'carton'; label: string; price: number }[] = [];
  if (product.price_per_piece != null)   unitOptions.push({ unit: 'piece',  label: 'بالحبة',   price: product.price_per_piece });
  if (product.price_per_kg != null)      unitOptions.push({ unit: 'kg',     label: 'بالكيلو',  price: product.price_per_kg });
  if (product.price_per_carton != null)  unitOptions.push({
    unit: 'carton',
    label: product.pieces_per_carton ? `بالكرتون (${product.pieces_per_carton} حبة)` : 'بالكرتون',
    price: product.price_per_carton,
  });
  const hasUnitOptions = unitOptions.length > 0;
  const effectiveUnit  = selectedUnit ?? (unitOptions[0]?.unit ?? null) as 'piece' | 'kg' | 'carton' | null;
  const basePrice      = hasUnitOptions
    ? (unitOptions.find((o) => o.unit === effectiveUnit)?.price ?? product.price)
    : (discounted ? product.discount_price! : product.price);
  const displayPrice   = (!hasUnitOptions && flashActive) ? product.flash_sale_price! : basePrice;

  function handleAddToCart() {
    if (outOfStock) return;
    recordEvent.mutate({ productId: product!.id, eventType: 'add_to_cart', userId: userId ?? undefined });
    addItem({
      id: '',
      cart_id: '',
      product_id: product!.id,
      quantity: orderQty,
      selected_unit: effectiveUnit,
      product: product!,
    });
    showToast(`تمت إضافة ${name} إلى السلة`);
  }

  // Per-piece price inside a carton, to show the saving vs. buying single pieces
  const perPieceInCarton = product.price_per_carton != null && product.pieces_per_carton
    ? product.price_per_carton / product.pieces_per_carton
    : null;
  const cartonSaving = perPieceInCarton != null && product.price_per_piece
    ? Math.round((1 - perPieceInCarton / product.price_per_piece) * 100)
    : 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', direction: 'rtl' as any }}>
      {/* Browser tab title while navigating inside the app. Crawlers get the
          full meta + Product JSON-LD from scripts/seo-prerender.mjs. */}
      <Head>
        <title>{`${name}${product.brands?.name ? ` - ${product.brands.name}` : ''} | فود بوكس`}</title>
      </Head>
      <View style={{ height: insets.top, backgroundColor: COLORS.surface }} />
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: Platform.OS !== 'web' })}
      >
        {/* Image gallery */}
        <View style={{ position: 'relative' }}>
          <ImageGallery
            images={images}
            discounted={discounted}
            originalPrice={product.price}
            discountPrice={product.discount_price ?? undefined}
            alt={name}
          />
        </View>

        {/* ── Details sheet ── */}
        <View style={{
          marginTop: -20, backgroundColor: '#fff',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingHorizontal: 16, paddingTop: 20, gap: 16, direction: 'rtl' as any,
        }}>
          {/* Brand + stock */}
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.brandText }}>
                {product.brands?.name ?? ''}
              </Text>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                backgroundColor: outOfStock ? '#FDECEC' : COLORS.greenTint,
                borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3,
              }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: outOfStock ? COLORS.danger : COLORS.green }} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: outOfStock ? COLORS.danger : COLORS.green }}>
                  {outOfStock ? 'نفد المخزون' : 'متوفر'}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.ink, lineHeight: 28 }}>
              {name}
            </Text>
            {product.weight != null && (
              <Text style={{ fontSize: 13, color: COLORS.muted }}>
                {product.weight} {product.weight_unit ?? 'كغ'}
              </Text>
            )}
          </View>

          {/* Flash sale countdown */}
          {flashActive && flashCountdown ? (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              backgroundColor: COLORS.brandTint, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
            }}>
              <Ionicons name="flash" size={20} color={COLORS.brandText} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.brandText }}>عرض فلاش — ينتهي خلال</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.ink, letterSpacing: 1 }}>{flashCountdown}</Text>
              </View>
              <View style={{ backgroundColor: COLORS.brandFill, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                  −{getDiscountPercent(product.price, product.flash_sale_price!)}%
                </Text>
              </View>
            </View>
          ) : null}

          {/* Price (single-price products) */}
          {!hasUnitOptions && (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: COLORS.ink }}>{formatPrice(displayPrice)}</Text>
              {(flashActive || discounted) && (
                <Text style={{ fontSize: 15, color: COLORS.faint, textDecorationLine: 'line-through' }}>
                  {formatPrice(product.price)}
                </Text>
              )}
            </View>
          )}

          {/* Unit picker */}
          {hasUnitOptions && !outOfStock && (
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.ink }}>اختر طريقة الشراء</Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {unitOptions.map((opt) => {
                  const active = effectiveUnit === opt.unit;
                  const note = opt.unit === 'carton' && perPieceInCarton != null
                    ? `${formatPrice(perPieceInCarton)} للحبة${cartonSaving > 0 ? ` · وفّر ${cartonSaving}%` : ''}`
                    : opt.unit === 'kg' ? 'سعر الكيلو' : opt.unit === 'piece' ? 'سعر الحبة' : '';
                  return (
                    <TouchableOpacity
                      key={opt.unit}
                      onPress={() => setSelectedUnit(opt.unit)}
                      accessibilityState={{ selected: active }}
                      activeOpacity={0.8}
                      style={{
                        flex: 1, minWidth: 140,
                        borderRadius: 14, borderWidth: active ? 2 : 1,
                        borderColor: active ? COLORS.brandFill : COLORS.line,
                        backgroundColor: active ? '#FFF6F1' : '#fff',
                        padding: active ? 12 : 13, gap: 2,
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.ink }}>{opt.label}</Text>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.ink }}>{formatPrice(opt.price)}</Text>
                      {!!note && (
                        <Text style={{ fontSize: 12, fontWeight: '500', color: opt.unit === 'carton' && cartonSaving > 0 ? COLORS.green : COLORS.muted }}>
                          {note}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Info box: min order + description */}
          <View style={{ borderWidth: 1, borderColor: COLORS.line, borderRadius: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="cube-outline" size={18} color={COLORS.ink} />
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: COLORS.ink }}>
                الحد الأدنى للطلب: <Text style={{ fontWeight: '700' }}>{minQty}</Text>
              </Text>
            </View>
            {!!description && (
              <View style={{ borderTopWidth: 1, borderTopColor: COLORS.line, padding: 12, gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.ink }}>الوصف</Text>
                <Text style={{ fontSize: 14, color: COLORS.muted, lineHeight: 23 }}>{description}</Text>
              </View>
            )}
          </View>

          {/* SKU / barcode */}
          {(product.sku || product.barcode) && (
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {product.sku && (
                <View style={{ backgroundColor: COLORS.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11, color: COLORS.muted }}>SKU: {product.sku}</Text>
                </View>
              )}
              {product.barcode && (
                <View style={{ backgroundColor: COLORS.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11, color: COLORS.muted }}>Barcode: {product.barcode}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Similar products */}
        <SimilarProducts categoryId={product.category_id} currentProductId={product.id} locale={locale} />

        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* ── Sticky top bar: transparent over the photo, solid white after scrolling ── */}
      <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top, left: 0, right: 0, height: BAR_H }}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', top: -insets.top, left: 0, right: 0, bottom: 0,
            backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.line,
            opacity: scrollY.interpolate({ inputRange: [GALLERY_FADE_AT - 60, GALLERY_FADE_AT], outputRange: [0, 1], extrapolate: 'clamp' }),
          }}
        />
        <View pointerEvents="box-none" style={{
          flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
          paddingHorizontal: 16, direction: 'rtl' as any,
        }}>
          {/* Start (right in RTL): one navigation button */}
          <TouchableOpacity
            onPress={hasHistory ? goBack : () => router.replace('/(customer)/home')}
            accessibilityLabel={hasHistory ? 'رجوع' : 'الرئيسية'}
            style={TOP_BTN}
          >
            <Ionicons name={hasHistory ? 'arrow-forward' : 'home-outline'} size={hasHistory ? 22 : 20} color={COLORS.ink} />
          </TouchableOpacity>

          {/* Product name fades in once the photo is gone */}
          <Animated.Text
            numberOfLines={1}
            style={{
              flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.ink, textAlign: 'center',
              opacity: scrollY.interpolate({ inputRange: [GALLERY_FADE_AT, GALLERY_FADE_AT + 40], outputRange: [0, 1], extrapolate: 'clamp' }),
            }}
          >
            {name}
          </Animated.Text>

          {/* End (left in RTL): actions — favourite sits at the outer edge */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <ShareButton productId={product.id} productName={name} />
            <WishlistButton productId={product.id} />
          </View>
        </View>
      </View>

      {/* ── Sticky footer: stepper + add to cart ── */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff',
        paddingHorizontal: 16, paddingTop: 12,
        paddingBottom: (insets.bottom || 0) + 12,
        borderTopWidth: 1, borderTopColor: COLORS.line,
        flexDirection: 'row', gap: 10, alignItems: 'center',
        direction: 'rtl' as any,
      }}>
        {outOfStock ? (
          <View style={{ flex: 1 }}>
            <StockAlertButton productId={product.id} />
          </View>
        ) : (
          <>
            <View style={{
              height: 52, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line,
              flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4,
            }}>
              <TouchableOpacity
                onPress={() => setQuantity((q) => Math.min(product.stock_quantity ?? 99, Math.max(minQty, q) + 1))}
                accessibilityLabel="زيادة الكمية"
                style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="add" size={22} color={COLORS.ink} />
              </TouchableOpacity>
              <Text style={{ minWidth: 28, textAlign: 'center', fontSize: 17, fontWeight: '700', color: COLORS.ink }}>
                {orderQty}
              </Text>
              <TouchableOpacity
                onPress={() => setQuantity((q) => Math.max(minQty, q - 1))}
                disabled={orderQty <= minQty}
                accessibilityLabel="إنقاص الكمية"
                style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center', opacity: orderQty <= minQty ? 0.35 : 1 }}
              >
                <Ionicons name="remove" size={22} color={COLORS.ink} />
              </TouchableOpacity>
            </View>
            <AddToCartButton
              onPress={handleAddToCart}
              outOfStock={false}
              totalPrice={formatPrice(displayPrice * orderQty)}
            />
          </>
        )}
      </View>
    </View>
  );
}

// ─── Similar Products ─────────────────────────────────────────────────────────
function SimilarProducts({ categoryId, currentProductId, locale }: { categoryId: string; currentProductId: string; locale: string }) {
  const router = useRouter();
  const { data, isLoading } = useProductsPage({
    categoryId,
    availableOnly: true,
    sortBy: 'newest',
    limit: 10,
  });
  const products = (data?.data ?? []).filter((p) => p.id !== currentProductId);

  if (isLoading) {
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator color={BRAND} />
      </View>
    );
  }
  if (products.length === 0) return null;

  return (
    <View style={{ marginTop: 28, marginBottom: 8 }}>
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.ink }}>منتجات مشابهة</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {products.map((item) => (
          <View key={item.id} style={{ width: 150 }}>
            <ProductCard product={item} onPress={() => router.push(`/(public)/products/${item.id}` as any)} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
