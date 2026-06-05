import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useBrands, useCreateBrand, useUpdateBrand, useDeleteBrand } from '@/hooks/useBrands';
import { Brand } from '@/types/models';

export default function AdminBrandsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: brands, isLoading } = useBrands(false);
  const createMutation = useCreateBrand();
  const updateMutation = useUpdateBrand();
  const deleteMutation = useDeleteBrand();

  const [newName, setNewName] = useState('');
  const [newSortOrder, setNewSortOrder] = useState('0');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSortOrder, setEditSortOrder] = useState('');

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    const sort_order = parseInt(newSortOrder) || 0;
    createMutation.mutate({ name, sort_order }, {
      onSuccess: () => { setNewName(''); setNewSortOrder('0'); },
    });
  }

  function startEdit(brand: Brand) {
    setEditingId(brand.id);
    setEditName(brand.name);
    setEditSortOrder(String(brand.sort_order));
  }

  function handleSaveEdit() {
    if (!editingId) return;
    const name = editName.trim();
    if (!name) return;
    const sort_order = parseInt(editSortOrder) || 0;
    updateMutation.mutate({ id: editingId, name, sort_order }, {
      onSuccess: () => setEditingId(null),
    });
  }

  function handleToggleActive(brand: Brand) {
    updateMutation.mutate({ id: brand.id, is_active: !brand.is_active });
  }

  function confirmDelete(brand: Brand) {
    if (Platform.OS === 'web') {
      if (window.confirm(`حذف الماركة "${brand.name}"؟`)) {
        deleteMutation.mutate(brand.id);
      }
      return;
    }
    Alert.alert('حذف الماركة', `حذف "${brand.name}"؟`, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteMutation.mutate(brand.id) },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
        <View style={{ width: 36 }} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>إدارة الماركات</Text>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard')} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18, color: '#374151' }}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Add new brand */}
      <View style={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="اسم الماركة الجديدة..."
            placeholderTextColor="#9ca3af"
            onSubmitEditing={handleAdd}
            style={{
              flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 8, fontSize: 14,
              backgroundColor: '#fff', textAlign: 'right', color: '#1c1917',
            }}
          />
          <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '600' }}>الاسم</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TextInput
            value={newSortOrder}
            onChangeText={setNewSortOrder}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#9ca3af"
            style={{
              width: 70, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
              paddingHorizontal: 12, paddingVertical: 8, fontSize: 14,
              textAlign: 'center', color: '#1c1917',
            }}
          />
          <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '600' }}>الترتيب</Text>
        </View>
        <TouchableOpacity
          onPress={handleAdd}
          disabled={createMutation.isPending || !newName.trim()}
          style={{
            alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
            backgroundColor: newName.trim() ? '#e36523' : '#e5e7eb',
          }}
        >
          <Text style={{ color: newName.trim() ? '#fff' : '#9ca3af', fontWeight: '700', fontSize: 14 }}>إضافة</Text>
        </TouchableOpacity>
      </View>

      {createMutation.error && (
        <View style={{ marginHorizontal: 16, marginTop: 8, borderRadius: 10, backgroundColor: '#fef2f2', padding: 10 }}>
          <Text style={{ color: '#dc2626', fontSize: 12 }}>{(createMutation.error as Error).message}</Text>
        </View>
      )}

      {/* Brands list */}
      <FlatList
        data={brands ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 16, paddingTop: 8 }}
        renderItem={({ item }) => (
          <View style={{
            marginHorizontal: 16, marginVertical: 4, backgroundColor: '#fff',
            borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center',
            borderWidth: 1, borderColor: '#e5e7eb',
          }}>
            {editingId === item.id ? (
              /* Edit mode */
              <View style={{ flex: 1, gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    value={editName}
                    onChangeText={setEditName}
                    autoFocus
                    placeholder="اسم الماركة"
                    placeholderTextColor="#9ca3af"
                    style={{
                      flex: 1, borderWidth: 1.5, borderColor: '#e36523', borderRadius: 10,
                      paddingHorizontal: 12, paddingVertical: 8, fontSize: 14,
                      textAlign: 'right', color: '#1c1917',
                    }}
                  />
                  <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '600' }}>الاسم</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    value={editSortOrder}
                    onChangeText={setEditSortOrder}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    style={{
                      width: 70, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
                      paddingHorizontal: 12, paddingVertical: 8, fontSize: 14,
                      textAlign: 'center', color: '#1c1917',
                    }}
                  />
                  <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '600' }}>الترتيب</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity onPress={() => setEditingId(null)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f3f4f6' }}>
                    <Text style={{ fontSize: 13, color: '#6b7280', fontWeight: '600' }}>إلغاء</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSaveEdit} disabled={updateMutation.isPending} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#e36523' }}>
                    <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700' }}>حفظ</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Display mode */
              <>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => confirmDelete(item)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fef2f2' }}>
                    <Text style={{ fontSize: 12, color: '#dc2626' }}>{t('common.delete')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => startEdit(item)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f3f4f6' }}>
                    <Text style={{ fontSize: 12, color: '#374151' }}>{t('common.edit')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleToggleActive(item)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: item.is_active ? '#ecfdf5' : '#fef2f2' }}>
                    <Text style={{ fontSize: 12, color: item.is_active ? '#059669' : '#dc2626' }}>
                      {item.is_active ? 'نشطة' : 'معطلة'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#1c1917' }}>{item.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: '#9ca3af' }}>الترتيب: {item.sort_order}</Text>
                    <Text style={{ fontSize: 11, color: item.is_active ? '#059669' : '#dc2626' }}>
                      {item.is_active ? '● نشطة' : '● معطلة'}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={{ marginTop: 60, alignItems: 'center' }}>
              <Text style={{ color: '#9ca3af', fontSize: 14 }}>لا توجد ماركات بعد</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
