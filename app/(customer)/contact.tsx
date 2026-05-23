import { View, Text, TouchableOpacity, ScrollView, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

const BRAND = '#e36523';

export default function ContactScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(customer)/home');
  }

  function openLink(url: string) {
    if (Platform.OS === 'web') window.open(url, '_blank');
    else Linking.openURL(url);
  }

  const phoneNumbers = t('contactUs.phoneValue')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);

  const items = [
    ...phoneNumbers.map((num) => ({
      icon: 'call-outline' as const,
      label: t('contactUs.phone'),
      value: num,
      onPress: () => openLink(`tel:${num}`),
    })),
    ...phoneNumbers.map((num) => ({
      icon: 'logo-whatsapp' as const,
      label: 'واتساب',
      value: num,
      onPress: () => openLink(`https://wa.me/${num.replace(/\D/g, '')}`),
    })),
    {
      icon: 'mail-outline' as const,
      label: t('contactUs.emailAddress'),
      value: t('contactUs.emailValue'),
      onPress: () => openLink(`mailto:${t('contactUs.emailValue')}`),
    },
    {
      icon: 'time-outline' as const,
      label: t('contactUs.workingHours'),
      value: t('contactUs.workingHoursValue'),
      onPress: undefined as (() => void) | undefined,
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f7f5' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 14,
          backgroundColor: '#fff',
          borderBottomWidth: 1, borderBottomColor: '#e6e0d8',
        }}>
          <TouchableOpacity onPress={goBack} style={{ padding: 6, marginLeft: -6, marginRight: 10 }}>
            <Ionicons name="arrow-back-outline" size={22} color="#5c4a35" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1c1917' }}>
            {t('contactUs.title')}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 24, gap: 12 }}>

          <Text style={{ fontSize: 14, color: '#857d78', textAlign: 'center', marginBottom: 8 }}>
            {t('contactUs.subtitle')}
          </Text>

          {items.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={item.onPress}
              disabled={!item.onPress}
              activeOpacity={item.onPress ? 0.75 : 1}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                backgroundColor: '#fff', borderRadius: 16,
                paddingHorizontal: 16, paddingVertical: 16,
                shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
                borderWidth: 1, borderColor: '#f0ebe4',
              }}
            >
              <View style={{
                width: 44, height: 44, borderRadius: 14,
                backgroundColor: '#fff7ed',
                alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Ionicons name={item.icon} size={20} color={BRAND} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#a09284', marginBottom: 3 }}>{item.label}</Text>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#1c1917' }}>{item.value}</Text>
              </View>
              {item.onPress && (
                <Ionicons name="chevron-forward" size={16} color="#c4b9ae" />
              )}
            </TouchableOpacity>
          ))}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
