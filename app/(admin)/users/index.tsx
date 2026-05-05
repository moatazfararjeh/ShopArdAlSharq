import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';import { Ionicons } from '@expo/vector-icons';
import { useUsers } from '@/hooks/useUsers';
import { UserWithStats } from '@/services/userService';
import { formatPrice } from '@/utils/formatPrice';
import { formatDate } from '@/utils/formatDate';

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === 'admin';
  return (
    <View style={{
      paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20,
      backgroundColor: isAdmin ? '#fff0eb' : '#f3f4f6',
    }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: isAdmin ? '#e36523' : '#6b7280' }}>
        {isAdmin ? 'مسؤول' : 'عميل'}
      </Text>
    </View>
  );
}

function UserCard({ item }: { item: UserWithStats }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push(`/(admin)/users/${item.id}` as any)}
      style={{
        backgroundColor: '#fff', borderRadius: 16,
        marginHorizontal: 16, marginVertical: 5,
        padding: 16, borderWidth: 1, borderColor: '#e6e0d8',
      }}
      activeOpacity={0.75}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <RoleBadge role={item.role} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1c1917', flex: 1, textAlign: 'right' }} numberOfLines={1}>
              {item.full_name || 'بدون اسم'}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: '#857d78', textAlign: 'right' }} numberOfLines={1}>{item.email}</Text>
          {item.phone ? (
            <Text style={{ fontSize: 12, color: '#857d78', textAlign: 'right' }}>{item.phone}</Text>
          ) : null}
        </View>

        {/* Avatar placeholder */}
        <View style={{
          width: 46, height: 46, borderRadius: 23,
          backgroundColor: '#fff0eb', alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#e36523' }}>
            {(item.full_name ?? item.email ?? '?')[0].toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Stats row — RTL order: آخر طلب | إجمالي المشتريات | طلبات */}
      <View style={{
        flexDirection: 'row', marginTop: 12, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: '#f3f0eb', gap: 16,
      }}>
        <View style={{ alignItems: 'center', flex: 2 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280' }}>
            {item.last_order_at ? formatDate(item.last_order_at) : '—'}
          </Text>
          <Text style={{ fontSize: 11, color: '#857d78', marginTop: 2 }}>آخر طلب</Text>
        </View>
        <View style={{ width: 1, backgroundColor: '#e6e0d8' }} />
        <View style={{ alignItems: 'center', flex: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#e36523' }}>{formatPrice(item.total_spent)}</Text>
          <Text style={{ fontSize: 11, color: '#857d78', marginTop: 2 }}>إجمالي المشتريات</Text>
        </View>
        <View style={{ width: 1, backgroundColor: '#e6e0d8' }} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#1c1917' }}>{item.total_orders}</Text>
          <Text style={{ fontSize: 11, color: '#857d78', marginTop: 2 }}>طلبات</Text>
        </View>
      </View>

      {/* Commercial register indicator */}
      {item.commercial_register_url ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
          <Text style={{ fontSize: 11, color: '#10b981', fontWeight: '600' }}>السجل التجاري مرفق</Text>
          <Ionicons name="document-text" size={13} color="#10b981" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export default function AdminUsersScreen() {
  const router = useRouter();
  const { data: users, isLoading } = useUsers();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!users) return [];
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        (u.full_name ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.phone ?? '').includes(q),
    );
  }, [users, search]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f7f5' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
        borderBottomWidth: 1, borderBottomColor: '#e6e0d8',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard' as any)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff0eb', borderRadius: 10 }}
          >
            <Ionicons name="home-outline" size={15} color="#e36523" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#e36523' }}>الرئيسية</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#1c1917' }}>
            إدارة الحسابات
          </Text>
        </View>
        {/* Search */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
        }}>
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </TouchableOpacity>
          ) : null}
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="بحث بالاسم أو الإيميل أو الجوال..."
            placeholderTextColor="#9ca3af"
            style={{ flex: 1, fontSize: 13, color: '#111827', textAlign: 'right' }}
          />
          <Ionicons name="search-outline" size={16} color="#9ca3af" />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <UserCard item={item} />}
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: 24 }}
        ListHeaderComponent={
          users && !isLoading ? (
            <Text style={{ fontSize: 12, color: '#9ca3af', paddingHorizontal: 20, paddingBottom: 4, marginTop: 4 }}>
              {filtered.length} حساب
            </Text>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={{ paddingTop: 80, alignItems: 'center' }}>
              <ActivityIndicator color="#e36523" />
            </View>
          ) : (
            <View style={{ paddingTop: 80, alignItems: 'center' }}>
              <Text style={{ color: '#857d78' }}>لا توجد نتائج</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
