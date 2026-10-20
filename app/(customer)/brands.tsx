import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useBrands, useBrandCategories } from '@/hooks/useBrands';
import { useProducts } from '@/hooks/useProducts';
import { ProductCard } from '@/components/product/ProductCard';
import { Brand, Product, getCategoryName } from '@/types/models';
import { getCurrentLocale } from '@/i18n';
import { COLORS } from '@/lib/theme';

const BRAND = '#e36523';

function CategoryChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        height: 38, borderRadius: 19, paddingHorizontal: 16, justifyContent: 'center',
        backgroundColor: active ? COLORS.ink : '#fff',
        borderWidth: 1, borderColor: active ? COLORS.ink : COLORS.line,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? '#fff' : COLORS.ink }}>{label}</Text>
    </TouchableOpacity>
  );
}

function BrandGridCard({ brand, onPress }: { brand: Brand; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flex: 1, backgroundColor: '#fff', borderRadius: 18,
        alignItems: 'center', paddingVertical: 20, gap: 10,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
      }}
    >
      <View style={{
        width: 72, height: 72, borderRadius: 36, overflow: 'hidden',
        backgroundColor: '#f0ece5', borderWidth: 1, borderColor: '#e6e0d6',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {brand.image_url ? (
          <Image source={{ uri: brand.image_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#1c1917', textAlign: 'center', paddingHorizontal: 4 }} numberOfLines={2}>
            {brand.name}
          </Text>
        )}
      </View>
      <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: '700', color: '#2d2320', textAlign: 'center' }}>
        {brand.name}
      </Text>
    </TouchableOpacity>
  );
}

export default function BrandsScreen() {
  const router = useRouter();
  const { data: brands, isLoading: brandsLoading } = useBrands();
  const locale = getCurrentLocale();
  const [selectedBrand, setSelectedBrandState] = useState<Brand | null>(null);
  // Category filter inside the chosen brand (الكل = undefined)
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const { data: brandCategories } = useBrandCategories(selectedBrand?.id);

  function setSelectedBrand(b: Brand | null) {
    setSelectedBrandState(b);
    setSelectedCategory(undefined);
  }

  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: productsLoading,
  } = useProducts(
    { brandId: selectedBrand?.id, categoryId: selectedCategory, availableOnly: true, sortBy: 'newest' },
    { enabled: !!selectedBrand },
  );
  const products: Product[] = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f7f5' }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e6e0d8',
      }}>
        <TouchableOpacity
          onPress={() => (selectedBrand ? setSelectedBrand(null) : router.back())}
          style={{ padding: 6, borderRadius: 10, backgroundColor: '#f5f0eb' }}
        >
          <Ionicons name="arrow-forward" size={20} color="#5c4a35" />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: '#1c1917', textAlign: 'right' }}>
          {selectedBrand ? selectedBrand.name : 'العلامات التجارية'}
        </Text>
      </View>

      {!selectedBrand ? (
        brandsLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={BRAND} />
          </View>
        ) : (
          <FlatList
            data={brands ?? []}
            numColumns={2}
            columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
            contentContainerStyle={{ gap: 12, paddingVertical: 16 }}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <BrandGridCard brand={item} onPress={() => setSelectedBrand(item)} />
            )}
            ListEmptyComponent={
              <View style={{ paddingTop: 80, alignItems: 'center' }}>
                <Text style={{ color: '#857d78', fontSize: 14 }}>لا توجد علامات تجارية</Text>
              </View>
            }
          />
        )
      ) : (
        <>
        {/* Categories this brand sells in */}
        {(brandCategories?.length ?? 0) > 1 && (
          <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.line, paddingVertical: 10 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8, flexDirection: 'row', direction: 'rtl' as any }}>
              <CategoryChip label="الكل" active={!selectedCategory} onPress={() => setSelectedCategory(undefined)} />
              {brandCategories!.map((c) => (
                <CategoryChip
                  key={c.id}
                  label={getCategoryName(c, locale as any)}
                  active={selectedCategory === c.id}
                  onPress={() => setSelectedCategory(c.id)}
                />
              ))}
            </ScrollView>
          </View>
        )}
        <FlatList
          data={products}
          numColumns={2}
          columnWrapperStyle={{ gap: 10, paddingHorizontal: 12 }}
          contentContainerStyle={{ gap: 16, paddingTop: 16, paddingBottom: 24 }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            // maxWidth: a lone last card keeps column width instead of stretching across the row
            <View style={{ flex: 1, maxWidth: '50%' }}>
              <ProductCard product={item} onPress={() => router.push(`/(public)/products/${item.id}` as any)} />
            </View>
          )}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingNextPage ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}><ActivityIndicator color={BRAND} /></View>
          ) : null}
          ListEmptyComponent={
            !productsLoading ? (
              <View style={{ paddingTop: 80, alignItems: 'center' }}>
                <Text style={{ color: '#857d78', fontSize: 14 }}>لا توجد منتجات متوفرة لهذه العلامة حالياً</Text>
              </View>
            ) : (
              <View style={{ paddingTop: 80, alignItems: 'center' }}>
                <ActivityIndicator color={BRAND} />
              </View>
            )
          }
        />
        </>
      )}
    </SafeAreaView>
  );
}
