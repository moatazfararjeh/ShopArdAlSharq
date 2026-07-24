import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { sendBroadcastNotification } from '@/services/pushNotificationService';

const BRAND = '#e36523';

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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f7f5' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard' as any)}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 20, color: '#374151' }}>‹</Text>
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#1c1917' }}>إرسال إشعار ترويجي</Text>
            <Text style={{ fontSize: 12, color: '#9ca3af' }}>يصل إلى جميع المستخدمين</Text>
          </View>
        </View>

        {/* Quick templates */}
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#6b7280', marginBottom: 10 }}>قوالب سريعة</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {QUICK_TEMPLATES.map((tpl) => (
            <TouchableOpacity
              key={tpl.title}
              onPress={() => { setTitle(tpl.title); setBody(tpl.body); }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
                borderWidth: 1.5, borderColor: '#ede8e1',
              }}
            >
              <Text style={{ fontSize: 16 }}>{tpl.icon}</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151' }}>{tpl.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form */}
        <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 16, gap: 4 }}>
          <Input
            label="عنوان الإشعار *"
            value={title}
            onChangeText={setTitle}
            placeholder="مثال: خصم 20% على جميع المنتجات!"
          />
          <Input
            label="نص الإشعار *"
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={4}
            placeholder="اكتب تفاصيل العرض أو الرسالة هنا..."
          />
        </View>

        {/* Preview */}
        {(title || body) ? (
          <View style={{
            backgroundColor: '#1c1917', borderRadius: 18, padding: 16, marginBottom: 20,
          }}>
            <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>معاينة الإشعار</Text>
            <View style={{ backgroundColor: '#374151', borderRadius: 12, padding: 14, flexDirection: 'row', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20 }}>📢</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#f9fafb' }}>{title || 'العنوان'}</Text>
                <Text style={{ fontSize: 12, color: '#d1d5db', marginTop: 3 }} numberOfLines={2}>{body || 'النص'}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {errorMsg ? (
          <View style={{ backgroundColor: '#fef2f2', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#fecaca' }}>
            <Text style={{ color: '#dc2626', fontWeight: '700', textAlign: 'right' }}>{errorMsg}</Text>
          </View>
        ) : null}

        {successMsg ? (
          <View style={{ backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#bbf7d0' }}>
            <Text style={{ color: '#16a34a', fontWeight: '700', textAlign: 'right' }}>{successMsg}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <ActivityIndicator color={BRAND} size="large" />
            <Text style={{ color: '#6b7280', marginTop: 10 }}>جارٍ الإرسال...</Text>
          </View>
        ) : (
          <Button title="إرسال للجميع 📢" onPress={handleSend} fullWidth size="lg" />
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
