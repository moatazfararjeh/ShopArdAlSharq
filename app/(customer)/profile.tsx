import { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, Alert, ScrollView, Platform,
  TextInput, ActivityIndicator, Linking, Switch,
} from 'react-native';
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
import { uploadDocument, getSignedDocumentUrl } from '@/services/storageService';
import { useToastStore } from '@/stores/toastStore';
import { useBiometric } from '@/hooks/useBiometric';

const BRAND = '#e36523';
const BG    = '#f8f7f5';

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <Text style={{
      fontSize: 11, fontWeight: '800', color: '#a09284',
      letterSpacing: 0.8, textTransform: 'uppercase',
      paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8,
      textAlign: 'right',
    }}>
      {label}
    </Text>
  );
}

// ─── Nav row ─────────────────────────────────────────────────────────────────
function NavRow({
  ionicon, label, sublabel, onPress, danger, right,
}: {
  ionicon: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  const iconBg  = danger ? '#fef2f2' : '#fff7ed';
  const iconCol = danger ? '#ef4444' : BRAND;
  const textCol = danger ? '#ef4444' : '#1c1917';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 14, paddingHorizontal: 18,
        borderBottomWidth: 1, borderBottomColor: '#f5f0eb',
        direction: 'rtl' as any,
        gap: 14,
      }}
    >
      {/* Icon bubble — appears on RIGHT in RTL */}
      <View style={{
        width: 40, height: 40, borderRadius: 13,
        backgroundColor: iconBg,
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Ionicons name={ionicon as any} size={20} color={iconCol} />
      </View>

      {/* Labels — grow to fill */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: textCol, textAlign: 'right' }}>
          {label}
        </Text>
        {!!sublabel && (
          <Text style={{ fontSize: 12, color: '#a09284', marginTop: 1, textAlign: 'right' }}>
            {sublabel}
          </Text>
        )}
      </View>

      {/* Right slot (custom content or chevron) */}
      {right ?? (!!onPress && !danger && (
        <Ionicons name="chevron-back" size={18} color="#c0b8b0" />
      ))}
    </TouchableOpacity>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View style={{
      backgroundColor: '#fff',
      marginHorizontal: 16,
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: '#1c1917',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
      ...style,
    }}>
      {children}
    </View>
  );
}

// ─── Profile screen ───────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, session, setProfile } = useAuthStore();
  const signOut = useSignOut();

  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [viewingDoc,   setViewingDoc]   = useState(false);
  const [editMode,     setEditMode]     = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [editName,     setEditName]     = useState('');
  const [editCompany,  setEditCompany]  = useState('');
  const [editPhone,    setEditPhone]    = useState('');

  const { isAvailable, isEnabled, clearCredentials, getBiometricLabel, getBiometricIcon } = useBiometric();

  // ── Edit helpers ───────────────────────────────────────────────────────────
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
        .update({
          full_name:    editName.trim(),
          company_name: editCompany.trim() || null,
          phone:        editPhone.trim()   || null,
        })
        .eq('id', session.user.id);
      if (error) throw error;
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (data) setProfile(data as any);
      setEditMode(false);
      useToastStore.getState().show('تم حفظ التغييرات بنجاح', 'success');
    } catch (e: any) {
      if (Platform.OS === 'web') window.alert(e?.message ?? 'فشل الحفظ');
      else Alert.alert('خطأ', e?.message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  }

  // ── Document helpers ───────────────────────────────────────────────────────
  async function handleViewDocument() {
    const storagePath = (profile as any)?.commercial_register_url;
    if (!storagePath) return;
    setViewingDoc(true);
    try {
      const signedUrl = await getSignedDocumentUrl(storagePath);
      if (Platform.OS === 'web') {
        const res = await fetch(signedUrl);
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        const ext = storagePath.split('.').pop() ?? 'jpg';
        a.download = `commercial_register.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
      } else {
        Linking.openURL(signedUrl);
      }
    } catch (e: any) {
      Alert.alert('خطأ', e?.message ?? 'تعذّر تحميل الملف');
    } finally {
      setViewingDoc(false);
    }
  }

  async function handleUploadCommercialRegister() {
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
    Alert.alert('السجل التجاري', 'اختر طريقة رفع المستند', [
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
    ]);
  }

  async function saveDocument(uri: string, name: string, mime: string) {
    if (!session?.user?.id) return;
    setUploadingDoc(true);
    try {
      const url = await uploadDocument(session.user.id, uri, name, mime);
      await (supabase.from('profiles') as any)
        .update({ commercial_register_url: url })
        .eq('id', session.user.id);
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (data) setProfile(data as any);
      Alert.alert('✓ تم الرفع', 'تم رفع السجل التجاري بنجاح');
    } catch (e: any) {
      Alert.alert('خطأ', e?.message ?? 'فشل رفع المستند');
    } finally {
      setUploadingDoc(false);
    }
  }

  // ── Refresh on focus ───────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      const userId = session?.user?.id;
      if (!userId) return;
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId as string)
        .single()
        .then(({ data }) => { if (data) setProfile(data as any); });
    }, [session?.user?.id]),
  );

  // ── Sign out ───────────────────────────────────────────────────────────────
  function handleSignOut() {
    if (Platform.OS === 'web') {
      if (window.confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        signOut.mutate(undefined, {
          onSuccess: () => router.replace('/(public)/login' as any),
        });
      }
      return;
    }
    Alert.alert(t('auth.logout'), 'هل أنت متأكد من تسجيل الخروج؟', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: () => signOut.mutate(undefined, {
          onSuccess: () => router.replace('/(public)/login' as any),
        }),
      },
    ]);
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const initials  = profile?.full_name?.charAt(0)?.toUpperCase() ?? '؟';
  const isAdmin   = profile?.role === 'admin' || profile?.role === 'super_admin';
  const hasDoc    = !!(profile as any)?.commercial_register_url;
  const roleBadge = isAdmin ? 'مدير' : 'عميل';
  const roleBg    = isAdmin ? '#fff7ed' : '#f0f9ff';
  const roleColor = isAdmin ? BRAND : '#0ea5e9';

  // ── Input field helper ─────────────────────────────────────────────────────
  function Field({
    label, value, onChangeText, editable = true,
    placeholder, keyboard,
  }: {
    label: string; value: string;
    onChangeText?: (v: string) => void;
    editable?: boolean; placeholder?: string;
    keyboard?: 'phone-pad' | 'email-address';
  }) {
    const locked = !editable;
    return (
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#a09284', marginBottom: 5, textAlign: 'right' }}>
          {label}
        </Text>
        <View style={{
          borderWidth: 1.5,
          borderColor: locked ? '#f0ece6' : '#e6ddd4',
          borderRadius: 14,
          paddingHorizontal: 14, paddingVertical: 11,
          backgroundColor: locked ? '#faf8f6' : '#fff',
          flexDirection: 'row', alignItems: 'center',
          direction: 'rtl' as any,
        }}>
          {locked && (
            <Ionicons name="lock-closed-outline" size={13} color="#c0b8b0" style={{ marginLeft: 6 }} />
          )}
          <TextInput
            value={value}
            onChangeText={locked ? undefined : onChangeText}
            editable={!locked}
            placeholder={placeholder}
            keyboardType={keyboard}
            style={{ flex: 1, fontSize: 14, color: locked ? '#a09284' : '#1c1917', textAlign: 'right' } as any}
            placeholderTextColor="#c0b8b0"
          />
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Orange header ── */}
        <View style={{
          backgroundColor: BRAND,
          paddingTop: 18, paddingBottom: 64,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
          direction: 'rtl' as any,
        }}>
          {/* Title row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff' }}>حسابي</Text>
            {/* Role badge */}
            <View style={{ backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.3 }}>{roleBadge}</Text>
            </View>
          </View>
        </View>

        {/* ── Avatar (overlaps header) ── */}
        <View style={{ alignItems: 'center', marginTop: -48, marginBottom: 4 }}>
          <View style={{
            width: 96, height: 96, borderRadius: 48,
            backgroundColor: '#fff',
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#1c1917', shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.15, shadowRadius: 16, elevation: 8,
            borderWidth: 3, borderColor: '#fff',
          }}>
            {!!profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={{ width: 96, height: 96, borderRadius: 48 }}
                contentFit="cover"
              />
            ) : (
              <Text style={{ fontSize: 38, color: BRAND, fontWeight: '900' }}>{initials}</Text>
            )}
          </View>
        </View>

        {/* ── Info card ── */}
        <Card style={{ marginTop: 8, marginBottom: 4 }}>
          {editMode ? (
            <View style={{ padding: 18 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#1c1917', textAlign: 'right', marginBottom: 16 }}>
                تعديل المعلومات
              </Text>
              <Field
                label="الاسم الكامل *"
                value={editName}
                onChangeText={profile?.full_name ? undefined : setEditName}
                editable={!profile?.full_name}
                placeholder="الاسم الكامل"
              />
              <Field
                label="اسم الشركة *"
                value={editCompany}
                onChangeText={(profile as any)?.company_name ? undefined : setEditCompany}
                editable={!(profile as any)?.company_name}
                placeholder="اسم الشركة"
              />
              <Field
                label="رقم الهاتف *"
                value={editPhone}
                onChangeText={profile?.phone ? undefined : setEditPhone}
                editable={!profile?.phone}
                placeholder="رقم الهاتف"
                keyboard="phone-pad"
              />
              <Field
                label="البريد الإلكتروني"
                value={profile?.email ?? ''}
                editable={false}
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  onPress={() => setEditMode(false)}
                  style={{ flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: '#f5f0eb', alignItems: 'center' }}
                >
                  <Text style={{ fontWeight: '700', color: '#5c4a35' }}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={saveProfile}
                  disabled={saving}
                  style={{ flex: 2, paddingVertical: 13, borderRadius: 14, backgroundColor: BRAND, alignItems: 'center' }}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ fontWeight: '800', color: '#fff', fontSize: 15 }}>حفظ التغييرات</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ padding: 18, alignItems: 'center', direction: 'rtl' as any }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#1c1917', textAlign: 'center', marginBottom: 4 }}>
                {profile?.full_name ?? '—'}
              </Text>
              {!!(profile as any)?.company_name && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <Ionicons name="business-outline" size={13} color={BRAND} />
                  <Text style={{ fontSize: 13, color: BRAND, fontWeight: '700' }}>{(profile as any).company_name}</Text>
                </View>
              )}
              <Text style={{ fontSize: 13, color: '#9ca3af', marginBottom: 2, textAlign: 'center' }}>{profile?.email ?? '—'}</Text>
              {!!profile?.phone && (
                <Text style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>📞 {profile.phone}</Text>
              )}
              {/* Role badge */}
              <View style={{ backgroundColor: roleBg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginTop: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: roleColor }}>{roleBadge}</Text>
              </View>
              {/* Edit button */}
              <TouchableOpacity
                onPress={openEdit}
                style={{
                  marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: '#fff7ed', paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20,
                  borderWidth: 1, borderColor: '#fedcb6',
                }}
              >
                <Ionicons name="pencil-outline" size={14} color={BRAND} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND }}>تعديل المعلومات</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>

        {/* ── Section: حسابي ── */}
        <SectionHeader label="حسابي" />
        <Card>
          <NavRow
            ionicon="bag-handle-outline"
            label={t('profile.myOrders')}
            onPress={() => router.push('/(customer)/orders/')}
          />
          <NavRow
            ionicon="location-outline"
            label={t('profile.savedAddresses')}
            onPress={() => router.push('/(customer)/addresses' as any)}
          />
        </Card>

        {/* ── Section: مستنداتي ── */}
        <SectionHeader label="مستنداتي" />
        <Card>
          {/* Commercial register row */}
          <View style={{
            paddingVertical: 14, paddingHorizontal: 18,
            direction: 'rtl' as any,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 40, height: 40, borderRadius: 13,
                backgroundColor: hasDoc ? '#f0fdf4' : '#fff7ed',
                alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Ionicons
                  name={hasDoc ? 'document-text' : 'document-text-outline'}
                  size={20}
                  color={hasDoc ? '#16a34a' : BRAND}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#1c1917', textAlign: 'right' }}>
                  السجل التجاري
                </Text>
                <Text style={{ fontSize: 12, color: hasDoc ? '#16a34a' : '#a09284', marginTop: 1, textAlign: 'right' }}>
                  {uploadingDoc ? 'جارٍ الرفع...' : hasDoc ? '✓ تم الرفع' : 'لم يتم الرفع بعد'}
                </Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              {hasDoc && (
                <TouchableOpacity
                  onPress={viewingDoc ? undefined : handleViewDocument}
                  activeOpacity={0.75}
                  style={{
                    flex: 1, flexDirection: 'row', alignItems: 'center',
                    justifyContent: 'center', gap: 6,
                    paddingVertical: 10, borderRadius: 12,
                    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac',
                    opacity: viewingDoc ? 0.5 : 1,
                    direction: 'rtl' as any,
                  }}
                >
                  {viewingDoc
                    ? <ActivityIndicator size="small" color="#16a34a" />
                    : <>
                        <Ionicons name="download-outline" size={15} color="#16a34a" />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#16a34a' }}>تحميل</Text>
                      </>}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={uploadingDoc ? undefined : handleUploadCommercialRegister}
                activeOpacity={0.75}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center',
                  justifyContent: 'center', gap: 6,
                  paddingVertical: 10, borderRadius: 12,
                  backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fedcb6',
                  opacity: uploadingDoc ? 0.5 : 1,
                  direction: 'rtl' as any,
                }}
              >
                {uploadingDoc
                  ? <ActivityIndicator size="small" color={BRAND} />
                  : <>
                      <Ionicons name="cloud-upload-outline" size={15} color={BRAND} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND }}>
                        {hasDoc ? 'إعادة رفع' : 'رفع الملف'}
                      </Text>
                    </>}
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* ── Section: الأمان ── */}
        <SectionHeader label="الأمان" />
        <Card>
          <NavRow
            ionicon="lock-closed-outline"
            label="تغيير كلمة المرور"
            onPress={() => router.push('/(customer)/change-password' as any)}
          />
          {Platform.OS !== 'web' && isAvailable && (
            <NavRow
              ionicon={getBiometricIcon() as any}
              label={`الدخول بـ${getBiometricLabel()}`}
              sublabel={isEnabled ? 'مفعّل' : 'غير مفعّل'}
              right={
                <Switch
                  value={isEnabled}
                  onValueChange={async (val) => {
                    if (!val) {
                      await clearCredentials();
                      useToastStore.getState().show('تم إلغاء الدخول بالبصمة', 'success');
                    } else {
                      useToastStore.getState().show('سجّل دخولك مرة أخرى لتفعيل البصمة', 'info');
                    }
                  }}
                  trackColor={{ false: '#e5e7eb', true: '#fdba74' }}
                  thumbColor={isEnabled ? BRAND : '#f4f4f5'}
                />
              }
            />
          )}
        </Card>

        {/* ── Section: الدعم ── */}
        <SectionHeader label="الدعم" />
        <Card>
          <NavRow
            ionicon="chatbubble-ellipses-outline"
            label={t('contactUs.title')}
            onPress={() => router.push('/(customer)/contact' as any)}
          />
          <NavRow
            ionicon="trash-outline"
            label="حذف الحساب"
            onPress={() => router.push('/(customer)/delete-account' as any)}
            danger
          />
        </Card>

        {/* ── Admin panel ── */}
        {isAdmin && (
          <>
            <SectionHeader label="الإدارة" />
            <Card style={{ borderWidth: 1.5, borderColor: BRAND }}>
              <NavRow
                ionicon="settings-outline"
                label="لوحة الإدارة"
                onPress={() => router.push('/(admin)/dashboard')}
              />
            </Card>
          </>
        )}

        {/* ── Sign out ── */}
        <View style={{ paddingHorizontal: 16, marginTop: 28 }}>
          <TouchableOpacity
            onPress={handleSignOut}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#fef2f2',
              borderRadius: 18, paddingVertical: 16,
              flexDirection: 'row', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              borderWidth: 1, borderColor: '#fecaca',
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#ef4444' }}>
              {t('auth.logout')}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
