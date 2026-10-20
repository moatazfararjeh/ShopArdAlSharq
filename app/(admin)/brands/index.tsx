import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform, TextInput, ActivityIndicator, FlatList } from 'react-native';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Skeleton } from '@/components/ui/Skeleton';
import { useBrands, useCreateBrand, useUpdateBrand, useDeleteBrand } from '@/hooks/useBrands';
import { useProductsPage } from '@/hooks/useProducts';
import { uploadImage } from '@/services/storageService';
import { BRAND_IMAGE_BUCKET } from '@/lib/constants';
import { COLORS } from '@/lib/theme';
import { Brand } from '@/types/models';
import { AdminHeader, AdminButton, AdminSearch, AdminChip, StatusPill, RowAction, AdminEmpty } from '@/components/admin/AdminUI';

function showAlert(title: string, msg: string) {
  Platform.OS === 'web' ? window.alert(msg) : Alert.alert(title, msg);
}

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

const inputStyle = {
  height: 44, borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, paddingHorizontal: 12,
  fontSize: 14, color: COLORS.ink, backgroundColor: '#fff',
} as const;

// ─── Add / edit form ──────────────────────────────────────────────────────────
function BrandForm({ title, initial, submitLabel, isPending, onSubmit, onCancel }: {
  title: string;
  initial: { name: string; sort: string; url: string };
  submitLabel: string;
  isPending: boolean;
  onSubmit: (name: string, sort: number, url: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [sort, setSort] = useState(initial.sort);
  const [url, setUrl] = useState(initial.url);
  const [uploading, setUploading] = useState(false);

  function submit() {
    const n = name.trim();
    const s = Number(sort.trim());
    const missing: string[] = [];
    if (!n) missing.push('الاسم');
    if (sort.trim() === '' || !Number.isInteger(s)) missing.push('الترتيب (رقم صحيح)');
    if (!url) missing.push('الصورة');
    if (missing.length) { showAlert('حقول مطلوبة', `يرجى تعبئة: ${missing.join('، ')}`); return; }
    onSubmit(n, s, url);
  }

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 12, borderWidth: 1, borderColor: COLORS.brand }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.ink }}>{title}</Text>
        <TouchableOpacity onPress={onCancel} accessibilityLabel="إغلاق" style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={20} color={COLORS.muted} />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.muted }}>الاسم</Text>
          <TextInput value={name} onChangeText={setName} placeholder="اسم الماركة" placeholderTextColor={COLORS.faint} style={{ ...inputStyle, textAlign: 'right' } as any} />
        </View>
        <View style={{ width: 90, gap: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.muted }}>الترتيب</Text>
          <TextInput value={sort} onChangeText={setSort} keyboardType="number-pad" placeholder="0" placeholderTextColor={COLORS.faint} style={{ ...inputStyle, textAlign: 'center' } as any} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TouchableOpacity
          onPress={() => pickAndUploadImage(setUrl, setUploading)}
          disabled={uploading}
          style={{ height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line }}
        >
          {uploading
            ? <ActivityIndicator size="small" color={COLORS.brand} />
            : url
              ? <Image source={{ uri: url }} accessibilityLabel="صورة الماركة" style={{ width: 28, height: 28, borderRadius: 6 }} contentFit="cover" />
              : <Ionicons name="camera-outline" size={18} color={COLORS.ink} />}
          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.ink }}>{url ? 'تغيير الصورة' : 'رفع صورة'}</Text>
        </TouchableOpacity>
        {!url && <Text style={{ fontSize: 12, color: COLORS.brandText }}>الصورة مطلوبة</Text>}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={submit}
          disabled={isPending || uploading}
          style={{ flex: 1, height: 44, borderRadius: 10, backgroundColor: COLORS.brandFill, alignItems: 'center', justifyContent: 'center' }}
        >
          {isPending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{submitLabel}</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={onCancel} style={{ height: 44, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.ink }}>إلغاء</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Brand row ────────────────────────────────────────────────────────────────
function BrandRow({ item, productCount, onEdit, onDelete, onToggle }: {
  item: Brand;
  productCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} accessibilityLabel={item.name} style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.surface }} contentFit="contain" />
      ) : (
        <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.brandTint, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="ribbon-outline" size={20} color={COLORS.brandText} />
        </View>
      )}

      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.ink }} numberOfLines={1}>{item.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <StatusPill label={item.is_active ? 'نشطة' : 'مخفية'} tone={item.is_active ? 'green' : 'muted'} />
          <Text style={{ fontSize: 12, color: productCount ? COLORS.muted : COLORS.brandText }}>
            {productCount ? `${productCount} منتج` : 'بدون منتجات'}
          </Text>
          <Text style={{ fontSize: 12, color: COLORS.faint }}>ترتيب {item.sort_order}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row' }}>
        <RowAction icon={item.is_active ? 'eye-off-outline' : 'eye-outline'} label={item.is_active ? 'إخفاء الماركة' : 'إظهار الماركة'} onPress={onToggle} color={COLORS.muted} />
        <RowAction icon="create-outline" label="تعديل" onPress={onEdit} />
        <RowAction icon="trash-outline" label="حذف" onPress={onDelete} color={COLORS.danger} />
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
type Filter = 'all' | 'active' | 'hidden' | 'empty';

export default function AdminBrandsScreen() {
  const { confirm, dialog } = useConfirm();
  const { data: brands, isLoading } = useBrands(false);
  const { data: productsPage } = useProductsPage({ availableOnly: false, page: 0, limit: 9999 });
  const createMutation = useCreateBrand();
  const updateMutation = useUpdateBrand();
  const deleteMutation = useDeleteBrand();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    productsPage?.data?.forEach((p) => { if (p.brand_id) counts[p.brand_id] = (counts[p.brand_id] ?? 0) + 1; });
    return counts;
  }, [productsPage]);

  const list = brands ?? [];
  const tests: Record<Filter, (b: Brand) => boolean> = {
    all: () => true,
    active: (b) => b.is_active,
    hidden: (b) => !b.is_active,
    empty: (b) => !productCounts[b.id],
  };
  const chips: Array<{ key: Filter; label: string }> = [
    { key: 'all', label: 'الكل' },
    { key: 'active', label: 'نشطة' },
    { key: 'hidden', label: 'مخفية' },
    { key: 'empty', label: 'بدون منتجات' },
  ];
  const q = query.trim().toLowerCase();
  const visible = list.filter((b) => tests[filter](b) && (!q || b.name.toLowerCase().includes(q)));

  async function confirmDelete(brand: Brand) {
    const used = productCounts[brand.id] ?? 0;
    const ok = await confirm({
      title: 'حذف الماركة',
      message: used
        ? `"${brand.name}" مرتبطة بـ ${used} منتج. بعد الحذف ستبقى هذه المنتجات بدون ماركة. هل تريد المتابعة؟`
        : `حذف "${brand.name}"؟`,
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      destructive: true,
    });
    if (ok) deleteMutation.mutate(brand.id);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface, direction: 'rtl' as any }}>
      <AdminHeader
        title="إدارة الماركات"
        subtitle={isLoading ? undefined : `${visible.length} من ${list.length}`}
        actions={<AdminButton primary icon="add" label="ماركة جديدة" onPress={() => { setAdding(true); setEditingId(null); }} />}
      >
        <AdminSearch value={query} onChangeText={setQuery} placeholder="بحث باسم الماركة" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {chips.map((c) => {
            const count = list.filter(tests[c.key]).length;
            if (count === 0 && c.key !== 'all' && filter !== c.key) return null;
            return <AdminChip key={c.key} label={c.label} count={count} active={filter === c.key} onPress={() => setFilter(c.key)} />;
          })}
        </View>
      </AdminHeader>

      <FlatList
        data={isLoading ? [] : visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={{ gap: 8 }}>
            {adding && (
              <BrandForm
                title="إضافة ماركة"
                initial={{ name: '', sort: String(list.length + 1), url: '' }}
                submitLabel="إضافة الماركة"
                isPending={createMutation.isPending}
                onCancel={() => setAdding(false)}
                onSubmit={(name, sort, url) => createMutation.mutate(
                  { name, sort_order: sort, image_url: url },
                  { onSuccess: () => setAdding(false) },
                )}
              />
            )}
            {isLoading && [1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Skeleton width={48} height={48} borderRadius={12} />
                <View style={{ flex: 1, gap: 8 }}>
                  <Skeleton width="45%" height={14} borderRadius={5} />
                  <Skeleton width="30%" height={11} borderRadius={5} />
                </View>
              </View>
            ))}
          </View>
        }
        ListEmptyComponent={!isLoading ? <AdminEmpty icon="ribbon-outline" text={q || filter !== 'all' ? 'لا توجد ماركات مطابقة' : 'لا توجد ماركات بعد'} /> : null}
        renderItem={({ item }) => editingId === item.id ? (
          <BrandForm
            title={`تعديل ${item.name}`}
            initial={{ name: item.name, sort: String(item.sort_order), url: item.image_url ?? '' }}
            submitLabel="حفظ"
            isPending={updateMutation.isPending}
            onCancel={() => setEditingId(null)}
            onSubmit={(name, sort, url) => updateMutation.mutate(
              { id: item.id, name, sort_order: sort, image_url: url },
              { onSuccess: () => setEditingId(null) },
            )}
          />
        ) : (
          <BrandRow
            item={item}
            productCount={productCounts[item.id] ?? 0}
            onEdit={() => { setEditingId(item.id); setAdding(false); }}
            onDelete={() => confirmDelete(item)}
            onToggle={() => updateMutation.mutate({ id: item.id, is_active: !item.is_active })}
          />
        )}
      />
      {dialog}
    </SafeAreaView>
  );
}
