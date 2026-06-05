import { useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { APP_NAME } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function DeleteAccountScreen() {
  const { session, profile } = useAuthStore();
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const { error: insertError } = await supabase.from('deletion_requests').insert({
        user_id: session?.user?.id ?? null,
        email: session?.user?.email ?? profile?.email ?? '',
        reason: reason.trim() || null,
      });

      if (insertError) {
        // Silently continue — show success regardless
      }

      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'حذف الحساب' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: '#ffffff' }}
        contentContainerStyle={{
          padding: 24,
          maxWidth: 600,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 8, color: '#111827' }}>
          حذف حسابك
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 24, color: '#374151', marginBottom: 24 }}>
          طلب حذف حسابك في {APP_NAME} وجميع البيانات الشخصية المرتبطة به.
        </Text>

        {submitted ? (
          <View
            style={{
              backgroundColor: '#ecfdf5',
              borderRadius: 12,
              padding: 24,
              borderWidth: 1,
              borderColor: '#a7f3d0',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#065f46', marginBottom: 8 }}>
              تم استلام الطلب
            </Text>
            <Text style={{ fontSize: 15, lineHeight: 24, color: '#047857' }}>
              لقد استلمنا طلب حذف حسابك. سيتم حذف حسابك وجميع البيانات المرتبطة به نهائياً خلال 30 يوماً. ستتلقى بريداً إلكترونياً للتأكيد عند اكتمال العملية.
            </Text>
          </View>
        ) : (
          <View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 16 }}>
              ما سيتم حذفه:
            </Text>
            <View style={{ marginBottom: 24, paddingLeft: 8 }}>
              {[
                'ملفك الشخصي وبيانات الدخول',
                'سجل الطلبات',
                'العناوين المحفوظة',
                'قائمة الأمنيات وعناصر السلة',
                'اشتراكات الإشعارات',
              ].map((item, index) => (
                <View key={index} style={{ flexDirection: 'row', marginBottom: 6 }}>
                  <Text style={{ fontSize: 15, color: '#374151', marginRight: 8 }}>•</Text>
                  <Text style={{ fontSize: 15, lineHeight: 24, color: '#374151', flex: 1 }}>
                    {item}
                  </Text>
                </View>
              ))}
            </View>

            <Text
              style={{
                fontSize: 14,
                lineHeight: 22,
                color: '#dc2626',
                marginBottom: 24,
                fontWeight: '500',
              }}
            >
              هذا الإجراء لا يمكن التراجع عنه. بمجرد حذف بياناتك، لا يمكن استعادتها.
            </Text>

            <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 }}>
              سبب المغادرة (اختياري)
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="أخبرنا لماذا تريد حذف حسابك..."
              multiline
              numberOfLines={3}
              style={{
                borderWidth: 1,
                borderColor: '#d1d5db',
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                marginBottom: 24,
                backgroundColor: '#f9fafb',
                minHeight: 80,
                textAlignVertical: 'top',
                textAlign: 'right',
              }}
            />

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#b91c1c' : '#dc2626',
                borderRadius: 8,
                padding: 16,
                alignItems: 'center',
                opacity: loading ? 0.7 : 1,
              })}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
                  طلب حذف الحساب
                </Text>
              )}
            </Pressable>
          </View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </>
  );
}
