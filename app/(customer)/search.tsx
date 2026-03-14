import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { ProductCard } from '@/components/product/ProductCard';
import { GetProductsParams } from '@/services/productService';
import { getCurrentLocale } from '@/i18n';
import { getCategoryName } from '@/types/models';
import { Product } from '@/types/models';
import { ScrollView } from 'react-native';

export default function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = getCurrentLocale();
  const inputRef = useRef<TextInput>(null);

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
  const hasQuery = search.length >= 2 || !!selectedCategory;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f7f5' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#1c1917', textAlign: 'center', marginBottom: 14 }}>
          {t('products.search', { defaultValue: 'بحث' })}
        </Text>

        {/* Search bar */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: '#f3f4f6',
          borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, gap: 8,
          borderWidth: 1, borderColor: '#e6e0d8',
        }}>
          <Ionicons name="search-outline" size={17} color="#9ca3af" />
          <TextInput
            ref={inputRef}
            value={search}
            onChangeText={setSearch}
            placeholder={t('products.search', { defaultValue: 'ابحث عن منتج...' })}
            style={{ flex: 1, fontSize: 14, color: '#111827' }}
            placeholderTextColor="#9ca3af"
            autoFocus
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color="#9ca3af" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Category filter pills */}
        {categories && categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingTop: 12 }}
          >
            <TouchableOpacity
              onPress={() => setSelectedCategory(undefined)}
              style={{
                paddingHorizontal: 16, paddingVertical: 7, borderRadius: 24,
                backgroundColor: !selectedCategory ? '#1c1917' : '#ede8e1',
                borderWidth: 0,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: !selectedCategory ? '#fff' : '#857d78' }}>
                {t('categories.allCategories')}
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id === selectedCategory ? undefined : cat.id)}
                style={{
                  paddingHorizontal: 16, paddingVertical: 7, borderRadius: 24,
                  backgroundColor: selectedCategory === cat.id ? '#1c1917' : '#ede8e1',
                  borderWidth: 0,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: selectedCategory === cat.id ? '#fff' : '#857d78' }}>
                  {getCategoryName(cat, locale)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
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
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24, gap: 10 }}
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
          ) : !hasQuery ? (
            <View style={{ paddingTop: 80, alignItems: 'center', gap: 10 }}>
              <Ionicons name="search-outline" size={52} color="#d1d5db" />
              <Text style={{ fontSize: 15, color: '#9ca3af', fontWeight: '500' }}>
                {t('products.search', { defaultValue: 'ابدأ بالكتابة للبحث' })}
              </Text>
            </View>
          ) : (
            <View style={{ paddingTop: 60, alignItems: 'center', paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 40, marginBottom: 10 }}>🔍</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151', textAlign: 'center' }}>
                {t('products.noProducts', { defaultValue: 'لا توجد نتائج' })}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
