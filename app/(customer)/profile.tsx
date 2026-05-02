import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, Platform, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useSignOut } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { uploadDocument } from '@/services/storageService';
import { changeLocale, getCurrentLocale, SupportedLocale } from '@/i18n';

function NavRow({ icon, label, onPress, danger }: { icon: string; label: string; onPress?: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 16, paddingHorizontal: 20,
        borderBottomWidth: 1, borderBottomColor: '#f9fafb',
      }}
      activeOpacity={0.7}
    >
      <View style={{
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: danger ? '#fef2f2' : '#fff7ed',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 14,
      }}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: danger ? '#ef4444' : '#111827' }}>
        {label}
      </Text>
      {onPress && !danger && (
        <Text style={{ color: '#9ca3af', fontSize: 20 }}>›</Text>
      )}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, session, setProfile } = useAuthStore();
  const signOut = useSignOut();
  const [locale, setLocale] = useState<SupportedLocale>(getCurrentLocale());
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editPhone, setEditPhone] = useState('');

  function openEdit() {
    setEditName(profile?.full_name ?? '');
    setEditCompany((profile as any)?.company_name ?? '');
    setEditPhone(profile?.phone ?? '');
    setEditMode(true);
  }

  async function saveProfile() {
    if (!session?.user?.id) return;
    if (!editName.trim()) {
      if (Platform.OS === 'web') window.alert('الاسم الكامل مطلوب');
      else Alert.alert('خطأ', 'الاسم الكامل مطلوب');
      return;
    }
    if (!editCompany.trim()) {
      if (Platform.OS === 'web') window.alert('اسم الشركة مطلوب');
      else Alert.alert('خطأ', 'اسم الشركة مطلوب');
      return;
    }
    if (!editPhone.trim()) {
      if (Platform.OS === 'web') window.alert('رقم الهاتف مطلوب');
      else Alert.alert('خطأ', 'رقم الهاتف مطلوب');
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase.from('profiles') as any)
        .update({ full_name: editName.trim(), company_name: editCompany.trim() || null, phone: editPhone.trim() || null })
        .eq('id', session.user.id);
      if (error) throw error;
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (data) setProfile(data as any);
      setEditMode(false);
    } catch (e: any) {
      if (Platform.OS === 'web') { window.alert(e?.message ?? 'فشل الحفظ'); }
      else { Alert.alert('خطأ', e?.message ?? 'فشل الحفظ'); }
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadCommercialRegister() {
    // On web, Alert.alert is a no-op — go straight to file picker
    if (Platform.OS === 'web') {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await saveDocument(asset.uri, asset.name, asset.mimeType ?? 'application/pdf');
      }
      return;
    }

    Alert.alert(
      'السجل التجاري',
      'اختر طريقة رفع المستند',
      [
        {
          text: 'صورة من المعرض',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('الإذن مطلوب', 'يرجى السماح بالوصول إلى الصور');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.85,
            });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              await saveDocument(asset.uri, asset.fileName ?? 'commercial_register.jpg', asset.mimeType ?? 'image/jpeg');
            }
          },
        },
        {
          text: 'ملف PDF / صورة',
          onPress: async () => {
            const result = await DocumentPicker.getDocumentAsync({
              type: ['image/*', 'application/pdf'],
              copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              await saveDocument(asset.uri, asset.name, asset.mimeType ?? 'application/pdf');
            }
          },
        },
        { text: 'إلغاء', style: 'cancel' },
      ],
    );
  }

  async function saveDocument(uri: string, name: string, mime: string) {
    if (!session?.user?.id) return;
    setUploadingDoc(true);
    try {
      const url = await uploadDocument(session.user.id, uri, name, mime);
      await (supabase.from('profiles') as any)
        .update({ commercial_register_url: url })
        .eq('id', session.user.id);
      // Refresh profile
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (data) setProfile(data as any);
      Alert.alert('✓ تم الرفع', 'تم رفع السجل التجاري بنجاح');
    } catch (e: any) {
      Alert.alert('خطأ', e?.message ?? 'فشل رفع المستند');
    } finally {
      setUploadingDoc(false);
    }
  }

  // Re-fetch profile every time this screen is focused so role changes
  // (e.g. set via SQL) are reflected without requiring logout.
  useFocusEffect(
    useCallback(() => {
      const userId = session?.user?.id;
      if (!userId) return;
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId as string)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data as any);
        });
    }, [session?.user?.id])
  );

  function handleSignOut() {
    if (Platform.OS === 'web') {
      // Alert.alert doesn't work on web
      if (window.confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        signOut.mutate();
      }
      return;
    }
    Alert.alert(t('auth.logout'), 'هل أنت متأكد من تسجيل الخروج؟', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: () => signOut.mutate(),
      },
    ]);
  }

  const initials = profile?.full_name?.charAt(0)?.toUpperCase() ?? '؟';
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f7f5' }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Orange header banner */}
        <View style={{
          backgroundColor: '#e36523',
          paddingTop: 20, paddingBottom: 52,
          paddingHorizontal: 24, alignItems: 'center',
        }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 24, alignSelf: 'center' }}>
            {t('profile.title')}
          </Text>
          <View style={{
            width: 88, height: 88, borderRadius: 44,
            backgroundColor: '#fff',
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, elevation: 8,
          }}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={{ width: 88, height: 88, borderRadius: 44 }}
                contentFit="cover"
              />
            ) : (
              <Text style={{ fontSize: 36, color: '#e36523', fontWeight: '800' }}>{initials}</Text>
            )}
          </View>
        </View>

        {/* Floating info card */}
        <View style={{
          backgroundColor: '#fff',
          marginHorizontal: 20, borderRadius: 22,
          padding: 20, marginTop: -32,
          shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 6,
          marginBottom: 20,
        }}>
          {editMode ? (
            <View style={{ width: '100%' }}>
              {/* الاسم الكامل */}
              <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4, fontWeight: '600' }}>الاسم الكامل <Text style={{ color: '#ef4444' }}>*</Text></Text>
              <TextInput
                value={editName}
                onChangeText={profile?.full_name ? undefined : setEditName}
                editable={!profile?.full_name}
                placeholder="الاسم الكامل"
                style={{ borderWidth: 1, borderColor: profile?.full_name ? '#f3f4f6' : '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: profile?.full_name ? '#9ca3af' : '#111827', marginBottom: 12, textAlign: 'right', backgroundColor: profile?.full_name ? '#f9fafb' : '#fff' }}
              />
              {/* اسم الشركة */}
              <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4, fontWeight: '600' }}>اسم الشركة <Text style={{ color: '#ef4444' }}>*</Text></Text>
              <TextInput
                value={editCompany}
                onChangeText={(profile as any)?.company_name ? undefined : setEditCompany}
                editable={!(profile as any)?.company_name}
                placeholder="اسم الشركة"
                style={{ borderWidth: 1, borderColor: (profile as any)?.company_name ? '#f3f4f6' : '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: (profile as any)?.company_name ? '#9ca3af' : '#111827', marginBottom: 12, textAlign: 'right', backgroundColor: (profile as any)?.company_name ? '#f9fafb' : '#fff' }}
              />
              {/* رقم الهاتف */}
              <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4, fontWeight: '600' }}>رقم الهاتف <Text style={{ color: '#ef4444' }}>*</Text></Text>
              <TextInput
                value={editPhone}
                onChangeText={profile?.phone ? undefined : setEditPhone}
                editable={!profile?.phone}
                placeholder="رقم الهاتف"
                keyboardType="phone-pad"
                style={{ borderWidth: 1, borderColor: profile?.phone ? '#f3f4f6' : '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: profile?.phone ? '#9ca3af' : '#111827', marginBottom: 12, textAlign: 'right', backgroundColor: profile?.phone ? '#f9fafb' : '#fff' }}
              />
              {/* البريد — always read-only */}
              <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4, fontWeight: '600' }}>البريد الإلكتروني</Text>
              <View style={{ borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16, backgroundColor: '#f9fafb' }}>
                <Text style={{ fontSize: 14, color: '#9ca3af' }}>{profile?.email ?? '—'}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setEditMode(false)}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: '#f3f4f6', alignItems: 'center' }}
                >
                  <Text style={{ fontWeight: '700', color: '#374151' }}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={saveProfile}
                  disabled={saving}
                  style={{ flex: 2, paddingVertical: 12, borderRadius: 14, backgroundColor: '#e36523', alignItems: 'center' }}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ fontWeight: '800', color: '#fff' }}>حفظ التغييرات</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 }}>
                {profile?.full_name ?? '—'}
              </Text>
              {(profile as any)?.company_name ? (
                <Text style={{ fontSize: 13, color: '#e36523', fontWeight: '700', marginBottom: 2 }}>{(profile as any).company_name}</Text>
              ) : null}
              <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 2 }}>{profile?.email ?? '—'}</Text>
              {profile?.phone ? (
                <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>📞 {profile.phone}</Text>
              ) : null}
              <TouchableOpacity
                onPress={openEdit}
                style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', backgroundColor: '#fff7ed', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
              >
                <Ionicons name="pencil-outline" size={14} color="#e36523" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#e36523' }}>تعديل المعلومات</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Nav list */}
        <View style={{
          backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 22,
          overflow: 'hidden',
          shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
          marginBottom: 16,
        }}>
          <NavRow icon="📦" label={t('profile.myOrders')} onPress={() => router.push('/(customer)/orders/')} />
          <NavRow icon="📍" label={t('profile.savedAddresses')} onPress={() => router.push('/(customer)/addresses' as any)} />
          {/* Commercial register */}
          <TouchableOpacity
            onPress={uploadingDoc ? undefined : handleUploadCommercialRegister}
            style={{
              flexDirection: 'row', alignItems: 'center',
              paddingVertical: 16, paddingHorizontal: 20,
              borderBottomWidth: 1, borderBottomColor: '#f9fafb',
            }}
            activeOpacity={0.7}
          >
            <View style={{
              width: 38, height: 38, borderRadius: 12,
              backgroundColor: (profile as any)?.commercial_register_url ? '#f0fdf4' : '#fff7ed',
              alignItems: 'center', justifyContent: 'center',
              marginRight: 14,
            }}>
              <Ionicons
                name={(profile as any)?.commercial_register_url ? 'document-text' : 'document-text-outline'}
                size={20}
                color={(profile as any)?.commercial_register_url ? '#16a34a' : '#e36523'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>السجل التجاري</Text>
              <Text style={{ fontSize: 12, color: (profile as any)?.commercial_register_url ? '#16a34a' : '#9ca3af', marginTop: 2 }}>
                {uploadingDoc ? 'جارٍ الرفع...' : (profile as any)?.commercial_register_url ? 'تم الرفع ✓' : 'لم يتم الرفع — اضغط للرفع'}
              </Text>
            </View>
            <Text style={{ color: '#9ca3af', fontSize: 20 }}>›</Text>
          </TouchableOpacity>
          {/* Language toggle hidden */}
        </View>

        {/* Admin panel — only visible to admins */}
        {isAdmin && (
        <View style={{
          backgroundColor: '#fff7ed', marginHorizontal: 20, borderRadius: 22,
          overflow: 'hidden',
          borderWidth: 1.5, borderColor: '#e36523',
          marginBottom: 16,
        }}>
          <NavRow icon="⚙️" label="لوحة الإدارة" onPress={() => router.push('/(admin)/dashboard')} />
        </View>
        )}

        {/* Logout */}
        <View style={{
          backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 22,
          overflow: 'hidden',
          shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
          marginBottom: 32,
        }}>
          <NavRow icon="🚪" label={t('auth.logout')} onPress={handleSignOut} danger />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
