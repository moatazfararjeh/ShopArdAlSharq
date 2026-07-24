import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform, TextInput, ActivityIndicator, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useBrands, useCreateBrand, useUpdateBrand, useDeleteBrand } from '@/hooks/useBrands';
import { uploadImage } from '@/services/storageService';
import { BRAND_IMAGE_BUCKET } from '@/lib/constants';
import { Brand } from '@/types/models';

const C = { surface: '#f0f4f8', card: '#ffffff', brand: '#e36523', text: '#1e293b', muted: '#64748b', hairline: '#e2e8f0' };

// ─── Image picker (cross-platform) ───────────────────────────────────────────
async function pickAndUploadImage(setUrl: (u: string) => void, setLoading: (v: boolean) => void) {
  if (Platform.OS === 'web') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setLoading(true);
      try {
        const result = await uploadImage(BRAND_IMAGE_BUCKET, `brand_${Date.now()}_${file.name}`, file);
        setUrl(result.publicUrl);
      } catch (err: any) {
        window.alert(err?.message ?? 'فشل رفع الصورة');
      } finally { setLoading(false); }
    };
    input.click();
  } else {
    const ImagePicker = require('expo-image-picker');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('إذن مطلوب', 'يرجى السماح بالوصول إلى الصور'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (result.canceled) return;
    setLoading(true);
    try {
      const asset = result.assets[0];
      const blob = await (await fetch(asset.uri)).blob();
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const uploadResult = await uploadImage(BRAND_IMAGE_BUCKET, `brand_${Date.now()}.${ext}`, blob);
      setUrl(uploadResult.publicUrl);
    } catch (err: any) {
      Alert.alert('خطأ', err?.message ?? 'فشل رفع الصورة');
    } finally { setLoading(false); }
  }
}

// ─── Inline image upload button ───────────────────────────────────────────────
function ImageUploadButton({ url, loading, onPress, onClear }: { url: string; loading: boolean; onPress: () => void; onClear: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <TouchableOpacity
        onPress={onPress}
        disabled={loading}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
          borderWidth: 1.5, borderColor: url ? '#10b981' : C.hairline,
          backgroundColor: url ? '#f0fdf4' : C.card,
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={C.brand} />
        ) : url ? (
          <Image source={{ uri: url }} style={{ width: 28, height: 28, borderRadius: 8 }} contentFit="cover" />
        ) : (
          <Ionicons name="camera-outline" size={18} color={C.muted} />
        )}
        <Text style={{ fontSize: 12, fontWeight: '700', color: url ? '#10b981' : '#ef4444' }}>
          {url ? 'تم الرفع ✓' : 'رفع صورة *'}
        </Text>
      </TouchableOpacity>
      {url ? (
        <TouchableOpacity onPress={onClear} style={{ padding: 4 }}>
          <Ionicons name="close-circle" size={18} color="#ef4444" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ─── Add form (collapsible) ───────────────────────────────────────────────────
function AddBrandPanel({ onAdd, isPending }: { onAdd: (name: string, sort: number, url: string) => void; isPending: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [sort, setSort] = useState('0');
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  if (!open) {
    return (
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, padding: 14, backgroundColor: C.card, borderRadius: 16, borderWidth: 1.5, borderColor: C.hairline, borderStyle: 'dashed' }}
      >
        <Ionicons name="add-circle-outline" size={22} color={C.brand} />
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.brand }}>إضافة ماركة جديدة</Text>
      </TouchableOpacity>
    );
  }

  function handleAdd() {
    const n = name.trim();
    const s = parseInt(sort);
    const missing: string[] = [];
    if (!n) missing.push('الاسم');
    if (isNaN(s)) missing.push('الترتيب');
    if (!url) missing.push('الصورة');
    if (missing.length) {
      const msg = `يرجى تعبئة: ${missing.join('، ')}`;
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('حقول مطلوبة', msg);
      return;
    }
    onAdd(n, s, url);
    setName(''); setSort('0'); setUrl(''); setOpen(false);
  }

  return (
    <View style={{ margin: 16, padding: 16, backgroundColor: C.card, borderRadius: 20, borderWidth: 1.5, borderColor: C.brand + '40', gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: C.text }}>إضافة ماركة</Text>
        <TouchableOpacity onPress={() => setOpen(false)}>
          <Ionicons name="close" size={20} color={C.muted} />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 12, color: C.muted, fontWeight: '600' }}>الاسم</Text>
        <TextInput
          value={name} onChangeText={setName} placeholder="اسم الماركة" placeholderTextColor="#94a3b8"
          style={{ flex: 1, borderWidth: 1.5, borderColor: C.hairline, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, textAlign: 'right', color: C.text, backgroundColor: '#f8fafc' }}
        />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 12, color: C.muted, fontWeight: '600' }}>الترتيب</Text>
        <TextInput
          value={sort} onChangeText={setSort} keyboardType="number-pad" placeholder="0" placeholderTextColor="#94a3b8"
          style={{ width: 70, borderWidth: 1.5, borderColor: C.hairline, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, textAlign: 'center', color: C.text, backgroundColor: '#f8fafc' }}
        />
      </View>

      <ImageUploadButton url={url} loading={uploading} onPress={() => pickAndUploadImage(setUrl, setUploading)} onClear={() => setUrl('')} />

      <TouchableOpacity
        onPress={handleAdd}
        disabled={isPending}
        style={{ backgroundColor: (name.trim() && url) ? C.brand : '#e2e8f0', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
      >
        <Text style={{ color: (name.trim() && url) ? '#fff' : '#94a3b8', fontWeight: '700', fontSize: 14 }}>
          {isPending ? 'جارٍ الإضافة...' : 'إضافة الماركة'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Brand row ────────────────────────────────────────────────────────────────
function BrandRow({ item, onEdit, onDelete, onToggle, isEditing, editState, onSaveEdit, onCancelEdit }: {
  item: Brand;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  isEditing: boolean;
  editState: { name: string; sort: string; url: string; uploading: boolean };
  onSaveEdit: (name: string, sort: number, url: string) => void;
  onCancelEdit: () => void;
}) {
  const [eName, setEName] = useState(editState.name);
  const [eSort, setESort] = useState(editState.sort);
  const [eUrl, setEUrl] = useState(editState.url);
  const [eUploading, setEUploading] = useState(false);

  if (isEditing) {
    return (
      <View style={{ marginHorizontal: 16, marginVertical: 4, backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: C.brand + '50', gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12, color: C.muted, fontWeight: '600' }}>الاسم</Text>
          <TextInput
            value={eName} onChangeText={setEName} autoFocus placeholder="اسم الماركة" placeholderTextColor="#94a3b8"
            style={{ flex: 1, borderWidth: 1.5, borderColor: C.brand, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, textAlign: 'right', color: C.text }}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12, color: C.muted, fontWeight: '600' }}>الترتيب</Text>
          <TextInput
            value={eSort} onChangeText={setESort} keyboardType="number-pad" placeholder="0" placeholderTextColor="#94a3b8"
            style={{ width: 70, borderWidth: 1.5, borderColor: C.hairline, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, textAlign: 'center', color: C.text }}
          />
        </View>
        <ImageUploadButton url={eUrl} loading={eUploading} onPress={() => pickAndUploadImage(setEUrl, setEUploading)} onClear={() => setEUrl('')} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <TouchableOpacity
            onPress={() => onSaveEdit(eName, parseInt(eSort), eUrl)}
            style={{ flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: C.brand, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700' }}>حفظ</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancelEdit} style={{ flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: C.muted, fontWeight: '600' }}>إلغاء</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{
      marginHorizontal: 16, marginVertical: 4,
      backgroundColor: C.card, borderRadius: 16, padding: 12,
      flexDirection: 'row', alignItems: 'center', gap: 12,
      shadowColor: '#1e293b', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    }}>
      {/* Image */}
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={{ width: 46, height: 46, borderRadius: 12 }} contentFit="cover" />
      ) : (
        <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="ribbon-outline" size={22} color="#94a3b8" />
        </View>
      )}

      {/* Info */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }} numberOfLines={1}>{item.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <TouchableOpacity onPress={onToggle} style={{
            paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20,
            backgroundColor: item.is_active ? '#f0fdf4' : '#fff1f2',
          }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: item.is_active ? '#16a34a' : '#ef4444' }}>
              {item.is_active ? 'نشطة' : 'معطلة'}
            </Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 10, color: C.muted }}>ترتيب: {item.sort_order}</Text>
        </View>
      </View>

      {/* Icon actions */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <TouchableOpacity onPress={onEdit} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="create-outline" size={16} color="#3b82f6" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AdminBrandsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: brands, isLoading } = useBrands(false);
  const createMutation = useCreateBrand();
  const updateMutation = useUpdateBrand();
  const deleteMutation = useDeleteBrand();
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleAdd(name: string, sort: number, url: string) {
    createMutation.mutate({ name, sort_order: sort, image_url: url });
  }

  function handleSaveEdit(id: string, name: string, sort: number, url: string) {
    const missing: string[] = [];
    if (!name) missing.push('الاسم');
    if (!url) missing.push('الصورة');
    if (missing.length) {
      const msg = `يرجى تعبئة: ${missing.join('، ')}`;
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('حقول مطلوبة', msg);
      return;
    }
    updateMutation.mutate({ id, name, sort_order: sort, image_url: url }, { onSuccess: () => setEditingId(null) });
  }

  function confirmDelete(brand: Brand) {
    if (Platform.OS === 'web') {
      if (window.confirm(`حذف الماركة "${brand.name}"؟`)) deleteMutation.mutate(brand.id);
      return;
    }
    Alert.alert('حذف الماركة', `حذف "${brand.name}"؟`, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteMutation.mutate(brand.id) },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }}>
      {/* ── Header ── */}
      <View style={{
        backgroundColor: C.card, paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: C.hairline,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard')}
          style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="home-outline" size={18} color={C.muted} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>إدارة الماركات</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={brands ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <AddBrandPanel onAdd={handleAdd} isPending={createMutation.isPending} />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={{ marginTop: 60, alignItems: 'center', gap: 10 }}>
              <Ionicons name="ribbon-outline" size={48} color="#cbd5e1" />
              <Text style={{ color: C.muted, fontSize: 14, fontWeight: '600' }}>لا توجد ماركات بعد</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <BrandRow
            item={item}
            isEditing={editingId === item.id}
            editState={{ name: item.name, sort: String(item.sort_order), url: item.image_url ?? '', uploading: false }}
            onEdit={() => setEditingId(item.id)}
            onDelete={() => confirmDelete(item)}
            onToggle={() => updateMutation.mutate({ id: item.id, is_active: !item.is_active })}
            onSaveEdit={(name, sort, url) => handleSaveEdit(item.id, name, sort, url)}
            onCancelEdit={() => setEditingId(null)}
          />
        )}
      />
    </SafeAreaView>
  );
}
