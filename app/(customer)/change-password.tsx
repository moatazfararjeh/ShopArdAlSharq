import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useToastStore } from '@/stores/toastStore';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (newPassword.length < 6) {
      useToastStore.getState().show('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      useToastStore.getState().show('كلمة المرور غير متطابقة', 'error');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      useToastStore.getState().show('تم تغيير كلمة المرور بنجاح، سيتم تسجيل خروجك', 'success');
      // Sign out so user logs in with new password
      await supabase.auth.signOut();
      router.replace('/(public)/login' as any);
    } catch (err: any) {
      useToastStore.getState().show(err.message || 'حدث خطأ', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f7f5' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e6e0d8' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <Ionicons name="arrow-forward" size={22} color="#1c1917" />
          </TouchableOpacity>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#1c1917', textAlign: 'center', marginRight: 30 }}>تغيير كلمة المرور</Text>
        </View>

        {/* Form */}
        <View style={{ padding: 24, maxWidth: 400, width: '100%', alignSelf: 'center' }}>
          <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 20, textAlign: 'right' }}>
            أدخل كلمة المرور الجديدة
          </Text>

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, textAlign: 'right' }}>كلمة المرور الجديدة</Text>
          <TextInput
            placeholder="أدخل كلمة المرور الجديدة"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            style={{
              borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 14, fontSize: 14,
              textAlign: 'right', marginBottom: 16, backgroundColor: '#fff',
            }}
            placeholderTextColor="#9ca3af"
          />

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, textAlign: 'right' }}>تأكيد كلمة المرور</Text>
          <TextInput
            placeholder="أعد إدخال كلمة المرور"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={{
              borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 14, fontSize: 14,
              textAlign: 'right', marginBottom: 24, backgroundColor: '#fff',
            }}
            placeholderTextColor="#9ca3af"
          />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={saving}
            style={{
              backgroundColor: '#e36523', borderRadius: 12,
              paddingVertical: 14, alignItems: 'center',
              opacity: saving ? 0.6 : 1,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
              {saving ? 'جارٍ الحفظ...' : 'حفظ كلمة المرور'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
