import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useBrands } from '@/hooks/useBrands';
import { useProducts } from '@/hooks/useProducts';
import { ProductCard } from '@/components/product/ProductCard';
import { Brand, Product } from '@/types/models';

const BRAND = '#e36523';

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
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: productsLoading,
  } = useProducts(
    { brandId: selectedBrand?.id, availableOnly: true, sortBy: 'newest' },
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
        <FlatList
          data={products}
          numColumns={2}
          columnWrapperStyle={{ gap: 10, paddingHorizontal: 12 }}
          contentContainerStyle={{ gap: 16, paddingTop: 16, paddingBottom: 24 }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={() => router.push(`/(public)/products/${item.id}` as any)} />
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
      )}
    </SafeAreaView>
  );
}
