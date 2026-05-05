import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';

interface Address {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  city: string;
  district: string | null;
  street: string | null;
  building_number: string | null;
  floor_number: string | null;
  apartment_number: string | null;
  is_default: boolean;
}

export default function AddressesScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { show: showToast } = useToastStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchAddresses() {
    if (!session?.user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', session.user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    setAddresses((data ?? []) as Address[]);
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { fetchAddresses(); }, [session?.user?.id]));

  async function setDefault(id: string) {
    if (!session?.user?.id) return;
    await (supabase.from('addresses') as any)
      .update({ is_default: false })
      .eq('user_id', session.user.id);
    await (supabase.from('addresses') as any)
      .update({ is_default: true })
      .eq('id', id);
    await fetchAddresses();
    showToast('تم تعيين العنوان الافتراضي', 'success');
  }

  function confirmDelete(id: string) {
    if (Platform.OS === 'web') {
      if (window.confirm('هل تريد حذف هذا العنوان؟')) deleteAddress(id);
      return;
    }
    Alert.alert('حذف العنوان', 'هل تريد حذف هذا العنوان؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteAddress(id) },
    ]);
  }

  async function deleteAddress(id: string) {
    await supabase.from('addresses').delete().eq('id', id);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    showToast('تم حذف العنوان', 'success');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f7f5' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderBottomWidth: 1, borderBottomColor: '#e6e0d8',
      }}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(customer)/profile' as any)}>
          <Ionicons name="arrow-forward" size={22} color="#1c1917" />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '800', color: '#1c1917' }}>العناوين المحفوظة</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#e36523" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 10 }}>
          {addresses.length === 0 && (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Ionicons name="location-outline" size={48} color="#d1cbc5" />
              <Text style={{ color: '#9ca3af', marginTop: 12, fontSize: 15 }}>لا توجد عناوين محفوظة</Text>
            </View>
          )}

          {addresses.map((addr) => (
            <View
              key={addr.id}
              style={{
                backgroundColor: '#fff', borderRadius: 16,
                borderWidth: 1.5,
                borderColor: addr.is_default ? '#e36523' : '#e6e0d8',
                padding: 16,
              }}
            >
              {/* Label + default badge */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#1c1917', flex: 1 }}>
                  {addr.label}
                </Text>
                {addr.is_default && (
                  <View style={{ backgroundColor: '#fff0eb', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#e36523' }}>افتراضي</Text>
                  </View>
                )}
              </View>

              <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 2 }}>
                {addr.recipient_name} · {addr.phone}
              </Text>
              <Text style={{ fontSize: 13, color: '#6b7280' }}>
                {addr.city}
                {addr.district ? ` · ${addr.district}` : ''}
                {addr.street ? ` · ${addr.street}` : ''}
                {addr.building_number ? ` · مبنى ${addr.building_number}` : ''}
                {addr.floor_number ? ` · ط${addr.floor_number}` : ''}
                {addr.apartment_number ? ` · شقة ${addr.apartment_number}` : ''}
              </Text>

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => router.push(`/(customer)/edit-address?id=${addr.id}` as any)}
                  style={{
                    flex: 1, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db',
                    paddingVertical: 8, alignItems: 'center', backgroundColor: '#f9fafb',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151' }}>تعديل</Text>
                </TouchableOpacity>
                {!addr.is_default && (
                  <TouchableOpacity
                    onPress={() => setDefault(addr.id)}
                    style={{
                      flex: 1, borderRadius: 10, borderWidth: 1, borderColor: '#e36523',
                      paddingVertical: 8, alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#e36523' }}>تعيين افتراضي</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => confirmDelete(addr.id)}
                  style={{
                    flex: 1, borderRadius: 10, borderWidth: 1, borderColor: '#fca5a5',
                    paddingVertical: 8, alignItems: 'center',
                    backgroundColor: '#fef2f2',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#ef4444' }}>حذف</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
