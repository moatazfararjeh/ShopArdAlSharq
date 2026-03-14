import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { useAuthStore } from '@/stores/authStore';
import { useSignOut } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
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
          alignItems: 'center',
          shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 6,
          marginBottom: 20,
        }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 }}>
            {profile?.full_name ?? '—'}
          </Text>
          <Text style={{ fontSize: 14, color: '#6b7280' }}>{profile?.email ?? '—'}</Text>
        </View>

        {/* Nav list */}
        <View style={{
          backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 22,
          overflow: 'hidden',
          shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
          marginBottom: 16,
        }}>
          <NavRow icon="📦" label={t('profile.myOrders')} onPress={() => router.push('/(customer)/orders/')} />
          <NavRow icon="📍" label={t('profile.savedAddresses')} onPress={() => {}} />
          {/* Language toggle */}
          <TouchableOpacity
            onPress={() => {
              const next: SupportedLocale = locale === 'ar' ? 'en' : 'ar';
              Alert.alert(
                next === 'ar' ? 'تغيير اللغة' : 'Change Language',
                next === 'ar'
                  ? 'سيتم تغيير اللغة إلى العربية. أعد تشغيل التطبيق لتطبيق الاتجاه الصحيح.'
                  : 'Language will change to English. Restart the app to apply layout direction.',
                [
                  { text: next === 'ar' ? 'إلغاء' : 'Cancel', style: 'cancel' },
                  {
                    text: next === 'ar' ? 'تأكيد' : 'Confirm',
                    onPress: async () => {
                      await changeLocale(next);
                      setLocale(next);
                    },
                  },
                ]
              );
            }}
            style={{
              flexDirection: 'row', alignItems: 'center',
              paddingVertical: 16, paddingHorizontal: 20,
              borderBottomWidth: 1, borderBottomColor: '#f9fafb',
            }}
            activeOpacity={0.7}
          >
            <View style={{
              width: 38, height: 38, borderRadius: 12,
              backgroundColor: '#fff7ed',
              alignItems: 'center', justifyContent: 'center',
              marginRight: 14,
            }}>
              <Text style={{ fontSize: 18 }}>🌐</Text>
            </View>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' }}>
              {t('profile.language')}
            </Text>
            {/* AR / EN pill toggle */}
            <View style={{ flexDirection: 'row', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#e6e0d8' }}>
              {(['ar', 'en'] as SupportedLocale[]).map((lang) => (
                <View
                  key={lang}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 5,
                    backgroundColor: locale === lang ? '#e36523' : '#fdfcfb',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: locale === lang ? '#fff' : '#857d78' }}>
                    {lang === 'ar' ? 'ع' : 'EN'}
                  </Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
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
