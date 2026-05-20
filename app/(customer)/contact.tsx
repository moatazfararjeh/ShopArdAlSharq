import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';

const BRAND = '#e36523';

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function ContactScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);

  const [form, setForm] = useState<ContactForm>({
    name: profile?.full_name ?? '',
    email: '',
    subject: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  function set(field: keyof ContactForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  }

  async function handleSend() {
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      const msg = t('common.required') + ' — ' + t('contactUs.name') + ', ' + t('contactUs.email') + ', ' + t('contactUs.subject') + ', ' + t('contactUs.message');
      if (Platform.OS === 'web') {
        setError(msg);
      } else {
        Alert.alert(t('common.error'), msg);
      }
      return;
    }

    setSending(true);
    setError('');
    try {
      // Simulate sending (replace with your actual email/support service call)
      await new Promise<void>((resolve) => setTimeout(resolve, 1200));
      setSent(true);
    } catch {
      const errMsg = t('contactUs.errorMsg');
      if (Platform.OS === 'web') setError(errMsg);
      else Alert.alert(t('common.error'), errMsg);
    } finally {
      setSending(false);
    }
  }

  const contactInfoItems = [
    {
      icon: 'call-outline' as const,
      label: t('contactUs.phone'),
      value: t('contactUs.phoneValue'),
    },
    {
      icon: 'mail-outline' as const,
      label: t('contactUs.emailAddress'),
      value: t('contactUs.emailValue'),
    },
    {
      icon: 'time-outline' as const,
      label: t('contactUs.workingHours'),
      value: t('contactUs.workingHoursValue'),
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f7f5' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#e6e0d8',
        }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 6, marginLeft: -6, marginRight: 10 }}>
            <Ionicons name="arrow-back-outline" size={22} color="#5c4a35" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1c1917' }}>
            {t('contactUs.title')}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 20, gap: 16 }}>

          {/* Subtitle */}
          <Text style={{ fontSize: 14, color: '#857d78', textAlign: 'center' }}>
            {t('contactUs.subtitle')}
          </Text>

          {/* ── Contact Info Card ───────────────────────────────────── */}
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 16,
            gap: 14,
            shadowColor: '#000',
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1c1917', marginBottom: 4 }}>
              {t('contactUs.contactInfo')}
            </Text>
            {contactInfoItems.map((item) => (
              <View key={item.label} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={{
                  width: 38, height: 38, borderRadius: 12,
                  backgroundColor: '#fff7ed',
                  alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Ionicons name={item.icon} size={18} color={BRAND} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: '#a09284', marginBottom: 2 }}>{item.label}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1c1917' }}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── Form Card ──────────────────────────────────────────── */}
          {sent ? (
            <View style={{
              backgroundColor: '#fff',
              borderRadius: 16,
              padding: 24,
              alignItems: 'center',
              gap: 12,
              shadowColor: '#000',
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
            }}>
              <View style={{
                width: 64, height: 64, borderRadius: 32,
                backgroundColor: '#dcfce7',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="checkmark-circle" size={36} color="#16a34a" />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#1c1917' }}>
                {t('contactUs.successTitle')}
              </Text>
              <Text style={{ fontSize: 14, color: '#857d78', textAlign: 'center', lineHeight: 22 }}>
                {t('contactUs.successMsg')}
              </Text>
              <TouchableOpacity
                onPress={() => { setSent(false); setForm({ name: profile?.full_name ?? '', email: '', subject: '', message: '' }); }}
                style={{
                  marginTop: 8,
                  paddingVertical: 10, paddingHorizontal: 24,
                  backgroundColor: '#fff7ed',
                  borderRadius: 12,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: BRAND }}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{
              backgroundColor: '#fff',
              borderRadius: 16,
              padding: 16,
              gap: 14,
              shadowColor: '#000',
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
            }}>
              <FormField label={t('contactUs.name')} value={form.name} onChangeText={(v) => set('name', v)} />
              <FormField label={t('contactUs.email')} value={form.email} onChangeText={(v) => set('email', v)} keyboardType="email-address" autoCapitalize="none" />
              <FormField label={t('contactUs.subject')} value={form.subject} onChangeText={(v) => set('subject', v)} />
              <FormField
                label={t('contactUs.message')}
                value={form.message}
                onChangeText={(v) => set('message', v)}
                placeholder={t('contactUs.messagePlaceholder')}
                multiline
                numberOfLines={5}
              />

              {error !== '' && (
                <Text style={{ fontSize: 13, color: '#ef4444' }}>{error}</Text>
              )}

              <TouchableOpacity
                onPress={handleSend}
                disabled={sending}
                activeOpacity={0.8}
                style={{
                  backgroundColor: BRAND,
                  borderRadius: 14,
                  paddingVertical: 15,
                  alignItems: 'center',
                  opacity: sending ? 0.75 : 1,
                }}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
                    {t('contactUs.send')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Small helper component ────────────────────────────────────────────────────
function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  numberOfLines,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#5c4a35' }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor="#c4b9ae"
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={{
          borderWidth: 1,
          borderColor: '#e6e0d8',
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 12 : 0,
          height: multiline ? undefined : 48,
          minHeight: multiline ? numberOfLines ? numberOfLines * 22 : 100 : undefined,
          fontSize: 14,
          color: '#1c1917',
          backgroundColor: '#fdfcfb',
        }}
      />
    </View>
  );
}
