import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, FlatList, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { ProductCard } from '@/components/product/ProductCard';
import { GetProductsParams } from '@/services/productService';
import { getCurrentLocale } from '@/i18n';
import { getCategoryName } from '@/types/models';
import { Product } from '@/types/models';

const BRAND = '#e36523';
const MAX_RECENT = 6;

export default function SearchScreen() {
  const { t }    = useTranslation();
  const router   = useRouter();
  const locale   = getCurrentLocale();
  const inputRef = useRef<TextInput>(null);

  const [search,           setSearch]           = useState('');
  const [committedSearch,  setCommittedSearch]  = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [recentSearches,   setRecentSearches]   = useState<string[]>([]);

  // Auto-focus input when screen is focused
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }, []),
  );

  // Commit search on submit or after 2+ chars
  function commitSearch(term: string) {
    const trimmed = term.trim();
    if (trimmed.length >= 2) {
      setCommittedSearch(trimmed);
      setRecentSearches((prev) => {
        const filtered = prev.filter((r) => r !== trimmed);
        return [trimmed, ...filtered].slice(0, MAX_RECENT);
      });
    } else {
      setCommittedSearch('');
    }
  }

  function handleChangeText(text: string) {
    setSearch(text);
    commitSearch(text);
  }

  function handleClear() {
    setSearch('');
    setCommittedSearch('');
    inputRef.current?.focus();
  }

  function applyRecent(term: string) {
    setSearch(term);
    commitSearch(term);
  }

  function clearRecent() {
    setRecentSearches([]);
  }

  const params: GetProductsParams = {
    search:      committedSearch.length >= 2 ? committedSearch : undefined,
    categoryId:  selectedCategory,
    availableOnly: true,
    sortBy:      'newest',
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useProducts(params);
  const { data: categories } = useCategories();

  const products: Product[] = data?.pages.flatMap((p) => p.data) ?? [];
  const totalCount = data?.pages[0]?.count ?? 0;
  const hasQuery   = committedSearch.length >= 2 || !!selectedCategory;

  // ─── Empty / promo state (no query yet) ───────────────────────────────────
  function EmptyPrompt() {
    return (
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 28 }}>
        {/* Recent searches */}
        {recentSearches.length > 0 && (
          <View style={{ marginBottom: 28 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 12,
              direction: 'rtl' as any,
            }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1c1917' }}>بحث سابق</Text>
              <TouchableOpacity onPress={clearRecent}>
                <Text style={{ fontSize: 12, color: '#a09284', fontWeight: '600' }}>مسح الكل</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, direction: 'rtl' as any }}>
              {recentSearches.map((term) => (
                <TouchableOpacity
                  key={term}
                  onPress={() => applyRecent(term)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    backgroundColor: '#fff', borderRadius: 20,
                    paddingHorizontal: 14, paddingVertical: 8,
                    borderWidth: 1, borderColor: '#e6ddd4',
                    shadowColor: '#1c1917', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
                  }}
                >
                  <Ionicons name="time-outline" size={13} color="#a09284" />
                  <Text style={{ fontSize: 13, color: '#4b4035', fontWeight: '600' }}>{term}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Illustration */}
        <View style={{ alignItems: 'center', paddingTop: 20 }}>
          <View style={{
            width: 100, height: 100, borderRadius: 50,
            backgroundColor: '#fff7ed',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            <Text style={{ fontSize: 44 }}>🔍</Text>
          </View>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#1c1917', marginBottom: 6 }}>
            ابحث عن منتجاتك
          </Text>
          <Text style={{ fontSize: 14, color: '#a09284', textAlign: 'center', lineHeight: 22 }}>
            ابحث بالاسم أو اختر قسماً{'\n'}للعثور على ما تريد
          </Text>
        </View>
      </View>
    );
  }

  // ─── No results state ─────────────────────────────────────────────────────
  function NoResults() {
    return (
      <View style={{ paddingTop: 60, alignItems: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 44, marginBottom: 12 }}>😕</Text>
        <Text style={{ fontSize: 17, fontWeight: '900', color: '#1c1917', textAlign: 'center', marginBottom: 6 }}>
          لا توجد نتائج
        </Text>
        <Text style={{ fontSize: 14, color: '#a09284', textAlign: 'center', lineHeight: 22 }}>
          {'لم نجد منتجات تطابق "'}
          {committedSearch}
          {'"'}
        </Text>
        <TouchableOpacity
          onPress={handleClear}
          style={{
            marginTop: 20, backgroundColor: '#fff7ed',
            borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10,
            borderWidth: 1, borderColor: '#fedcb6',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND }}>مسح البحث</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Result count header ──────────────────────────────────────────────────
  function ResultsHeader() {
    if (!hasQuery || isLoading || products.length === 0) return null;
    return (
      <View style={{
        paddingHorizontal: 16, paddingVertical: 10,
        flexDirection: 'row', alignItems: 'center',
        direction: 'rtl' as any,
      }}>
        <Text style={{ fontSize: 13, color: '#a09284', fontWeight: '600' }}>
          {totalCount > 0 ? `${totalCount} منتج` : `${products.length} منتج`}
        </Text>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f7f5' }}>

      {/* ── Header ── */}
      <View style={{
        backgroundColor: '#fff',
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: '#f0ece6',
        shadowColor: '#1c1917', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
      }}>
        {/* Title */}
        <Text style={{
          fontSize: 20, fontWeight: '900', color: '#1c1917',
          textAlign: 'right', marginBottom: 12,
        }}>
          بحث
        </Text>

        {/* Search bar */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: '#f5f0eb',
          borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
          gap: 10, direction: 'rtl' as any,
          borderWidth: 1.5, borderColor: search.length >= 2 ? BRAND : 'transparent',
        }}>
          <Ionicons name="search-outline" size={18} color={search.length >= 2 ? BRAND : '#a09284'} />
          <TextInput
            ref={inputRef}
            value={search}
            onChangeText={handleChangeText}
            onSubmitEditing={() => commitSearch(search)}
            placeholder="ابحث عن منتج، ماركة، قسم..."
            style={{ flex: 1, fontSize: 15, color: '#1c1917', textAlign: 'right' } as any}
            placeholderTextColor="#a09284"
            returnKeyType="search"
            clearButtonMode="never"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View style={{
                width: 20, height: 20, borderRadius: 10,
                backgroundColor: '#c0b8b0',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="close" size={12} color="#fff" />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Category pills */}
        {categories && categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingTop: 12, direction: 'rtl' as any }}
          >
            {/* All */}
            <TouchableOpacity
              onPress={() => setSelectedCategory(undefined)}
              style={{
                paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24,
                backgroundColor: !selectedCategory ? BRAND : '#f0ece6',
                shadowColor: !selectedCategory ? BRAND : 'transparent',
                shadowOpacity: 0.3, shadowRadius: 6, elevation: !selectedCategory ? 3 : 0,
              }}
            >
              <Text style={{
                fontSize: 13, fontWeight: '700',
                color: !selectedCategory ? '#fff' : '#6b5c4e',
              }}>
                الكل
              </Text>
            </TouchableOpacity>

            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(active ? undefined : cat.id)}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24,
                    backgroundColor: active ? BRAND : '#f0ece6',
                    shadowColor: active ? BRAND : 'transparent',
                    shadowOpacity: 0.3, shadowRadius: 6, elevation: active ? 3 : 0,
                  }}
                >
                  <Text style={{
                    fontSize: 13, fontWeight: '700',
                    color: active ? '#fff' : '#6b5c4e',
                  }}>
                    {getCategoryName(cat, locale)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ── Results ── */}
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
        contentContainerStyle={{ paddingBottom: 32, gap: 10 }}
        ListHeaderComponent={<ResultsHeader />}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator color={BRAND} />
            </View>
          ) : hasNextPage ? (
            <TouchableOpacity
              onPress={() => fetchNextPage()}
              style={{
                marginHorizontal: 16, marginTop: 8,
                paddingVertical: 14, alignItems: 'center',
                backgroundColor: '#fff7ed', borderRadius: 14,
                flexDirection: 'row', justifyContent: 'center', gap: 6,
                borderWidth: 1, borderColor: '#fedcb6',
              }}
            >
              <Text style={{ color: BRAND, fontWeight: '700', fontSize: 14 }}>تحميل المزيد</Text>
              <Ionicons name="chevron-down" size={16} color={BRAND} />
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={{ paddingTop: 80, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={BRAND} />
            </View>
          ) : !hasQuery ? (
            <EmptyPrompt />
          ) : (
            <NoResults />
          )
        }
      />
    </SafeAreaView>
  );
}
