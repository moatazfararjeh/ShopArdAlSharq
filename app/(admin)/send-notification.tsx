import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { sendBroadcastNotification } from '@/services/pushNotificationService';

const C = { surface: '#f0f4f8', card: '#ffffff', brand: '#e36523', text: '#1e293b', muted: '#64748b', hairline: '#e2e8f0' };

const QUICK_TEMPLATES = [
  { icon: '🎁', title: 'عرض خاص!', body: 'تسوق الآن واستمتع بأفضل العروض والخصومات.' },
  { icon: '🚚', title: 'توصيل مجاني اليوم', body: 'اطلب الآن واحصل على توصيل مجاني لجميع الطلبات.' },
  { icon: '🛍️', title: 'منتجات جديدة', body: 'تم إضافة منتجات جديدة — تفضل بالاطلاع عليها الآن!' },
];

export default function SendNotificationScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  async function doSend() {
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const { sentCount } = await sendBroadcastNotification(title.trim(), body.trim());
      setSuccessMsg(`✅ تم إرسال الإشعار إلى ${sentCount} مستخدم`);
      setTitle('');
      setBody('');
    } catch (e) {
      setErrorMsg((e as Error).message ?? 'فشل الإرسال');
    } finally {
      setLoading(false);
    }
  }

  function handleSend() {
    if (!title.trim()) { setErrorMsg('يرجى إدخال عنوان الإشعار'); return; }
    if (!body.trim())  { setErrorMsg('يرجى إدخال نص الإشعار');   return; }
    setErrorMsg('');

    const confirmMsg = `سيتم إرسال الإشعار إلى جميع المستخدمين:\n\n"${title.trim()}"`;

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) doSend();
    } else {
      Alert.alert('تأكيد الإرسال', confirmMsg, [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'إرسال', style: 'default', onPress: doSend },
      ]);
    }
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
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard' as any)}
          style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="home-outline" size={18} color={C.muted} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>إرسال إشعار ترويجي</Text>
          <Text style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>يصل إلى جميع المستخدمين</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">

        {/* Quick templates */}
        <Text style={{ fontSize: 12, fontWeight: '700', color: C.muted, marginBottom: 10, textAlign: 'right', letterSpacing: 0.5 }}>
          قوالب سريعة
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {QUICK_TEMPLATES.map((tpl) => (
            <TouchableOpacity
              key={tpl.title}
              onPress={() => { setTitle(tpl.title); setBody(tpl.body); setSuccessMsg(''); setErrorMsg(''); }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: C.card, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
                borderWidth: 1.5, borderColor: C.hairline,
                shadowColor: '#1e293b', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
              }}
            >
              <Text style={{ fontSize: 16 }}>{tpl.icon}</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{tpl.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form */}
        <View style={{ backgroundColor: C.card, borderRadius: 18, padding: 16, marginBottom: 16, gap: 14, shadowColor: '#1e293b', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          {/* Title field */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.muted, textAlign: 'right' }}>عنوان الإشعار *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="مثال: خصم 20% على جميع المنتجات!"
              placeholderTextColor="#94a3b8"
              style={{
                borderWidth: 1.5, borderColor: title ? C.brand : C.hairline,
                borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
                fontSize: 14, textAlign: 'right', color: C.text, backgroundColor: '#f8fafc',
              }}
            />
          </View>

          {/* Body field */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.muted, textAlign: 'right' }}>نص الإشعار *</Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="اكتب تفاصيل العرض أو الرسالة هنا..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
              style={{
                borderWidth: 1.5, borderColor: body ? C.brand : C.hairline,
                borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
                fontSize: 14, textAlign: 'right', color: C.text, backgroundColor: '#f8fafc',
                minHeight: 100, textAlignVertical: 'top',
              }}
            />
          </View>
        </View>

        {/* Preview */}
        {(title || body) ? (
          <View style={{ backgroundColor: '#0d1b2a', borderRadius: 18, padding: 16, marginBottom: 20 }}>
            <Text style={{ fontSize: 11, color: '#64748b', marginBottom: 8, textAlign: 'right' }}>معاينة الإشعار</Text>
            <View style={{ backgroundColor: '#1e293b', borderRadius: 14, padding: 14, flexDirection: 'row', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20 }}>📢</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#f8fafc' }}>{title || 'العنوان'}</Text>
                <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }} numberOfLines={2}>{body || 'النص'}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Error */}
        {errorMsg ? (
          <View style={{ backgroundColor: '#fef2f2', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#fecaca', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
            <Text style={{ color: '#dc2626', fontWeight: '700', flex: 1, textAlign: 'right' }}>{errorMsg}</Text>
            <Ionicons name="alert-circle" size={18} color="#dc2626" />
          </View>
        ) : null}

        {/* Success */}
        {successMsg ? (
          <View style={{ backgroundColor: '#f0fdf4', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#bbf7d0', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
            <Text style={{ color: '#16a34a', fontWeight: '700', flex: 1, textAlign: 'right' }}>{successMsg}</Text>
            <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
          </View>
        ) : null}

        {/* Send button */}
        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
            <ActivityIndicator color={C.brand} size="large" />
            <Text style={{ color: C.muted, fontSize: 13, fontWeight: '600' }}>جارٍ الإرسال...</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleSend}
            style={{
              backgroundColor: (title.trim() && body.trim()) ? C.brand : '#e2e8f0',
              borderRadius: 16, paddingVertical: 16,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              shadowColor: C.brand, shadowOpacity: (title.trim() && body.trim()) ? 0.3 : 0, shadowRadius: 10, elevation: (title.trim() && body.trim()) ? 4 : 0,
            }}
          >
            <Ionicons name="megaphone-outline" size={20} color={(title.trim() && body.trim()) ? '#fff' : '#94a3b8'} />
            <Text style={{ color: (title.trim() && body.trim()) ? '#fff' : '#94a3b8', fontWeight: '800', fontSize: 15 }}>
              إرسال للجميع
            </Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
