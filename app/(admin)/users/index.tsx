import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useUsers } from '@/hooks/useUsers';
import { UserWithStats } from '@/services/userService';
import { formatPrice } from '@/utils/formatPrice';
import { formatDate } from '@/utils/formatDate';

const C = { surface: '#f0f4f8', card: '#ffffff', brand: '#e36523', text: '#1e293b', muted: '#64748b', hairline: '#e2e8f0' };

function Avatar({ name, email }: { name: string | null; email: string | null }) {
  const initial = (name ?? email ?? '?')[0].toUpperCase();
  return (
    <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: C.brand }}>{initial}</Text>
    </View>
  );
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === 'admin';
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, backgroundColor: isAdmin ? '#fff7ed' : '#f1f5f9' }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: isAdmin ? C.brand : C.muted }}>
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
      activeOpacity={0.75}
      style={{
        backgroundColor: C.card, borderRadius: 18,
        marginHorizontal: 16, marginVertical: 5,
        padding: 14,
        shadowColor: '#1e293b', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3,
      }}
    >
      {/* Top row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Avatar name={item.full_name} email={item.email} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 3 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, textAlign: 'right' }} numberOfLines={1}>
              {item.full_name || 'بدون اسم'}
            </Text>
            <RoleBadge role={item.role} />
          </View>
          <Text style={{ fontSize: 12, color: C.muted, textAlign: 'right' }} numberOfLines={1}>{item.email}</Text>
          {item.phone ? (
            <Text style={{ fontSize: 12, color: C.muted, textAlign: 'right' }}>{item.phone}</Text>
          ) : null}
        </View>
        <Ionicons name="chevron-back" size={16} color="#cbd5e1" />
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', paddingTop: 12, borderTopWidth: 1, borderTopColor: C.hairline }}>
        <View style={{ flex: 2, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: C.text }}>
            {item.last_order_at ? formatDate(item.last_order_at) : '—'}
          </Text>
          <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>آخر طلب</Text>
        </View>
        <View style={{ width: 1, backgroundColor: C.hairline }} />
        <View style={{ flex: 2, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '900', color: C.brand }}>{formatPrice(item.total_spent)}</Text>
          <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>إجمالي المشتريات</Text>
        </View>
        <View style={{ width: 1, backgroundColor: C.hairline }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '900', color: C.text }}>{item.total_orders}</Text>
          <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>طلبات</Text>
        </View>
      </View>

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
    <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }}>
      {/* ── Header ── */}
      <View style={{
        backgroundColor: C.card, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: C.hairline,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard' as any)}
            style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="home-outline" size={18} color={C.muted} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>إدارة الحسابات</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f1f5f9', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 }}>
          <Ionicons name="search-outline" size={16} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="بحث بالاسم أو الإيميل أو الجوال..."
            placeholderTextColor="#94a3b8"
            style={{ flex: 1, fontSize: 13, color: C.text, textAlign: 'right' }}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: 32 }}
        ListHeaderComponent={
          users && !isLoading ? (
            <Text style={{ fontSize: 12, color: C.muted, paddingHorizontal: 20, paddingBottom: 4, marginTop: 4, textAlign: 'right' }}>
              {filtered.length} حساب
            </Text>
          ) : null
        }
        renderItem={({ item }) => <UserCard item={item} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ paddingTop: 80, alignItems: 'center' }}>
              <ActivityIndicator color={C.brand} />
            </View>
          ) : (
            <View style={{ paddingTop: 80, alignItems: 'center', gap: 10 }}>
              <Ionicons name="people-outline" size={48} color="#cbd5e1" />
              <Text style={{ color: C.muted, fontSize: 15, fontWeight: '600' }}>لا توجد نتائج</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
