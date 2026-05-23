import { useEffect, useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { parseSupabaseError } from '@/lib/errors';

const schema = z
  .object({
    password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'كلمة المرور غير متطابقة',
    path: ['confirm'],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  // Supabase detects the #access_token=...&type=recovery hash on page load
  // and fires the PASSWORD_RECOVERY event. Wait for it before showing the form.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    // On web the hash is processed synchronously before the first render —
    // give it a short window to fire, then show the form regardless so the
    // user is never stuck on a blank screen.
    const timer = setTimeout(() => setReady(true), 2000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function onSubmit(values: FormValues) {
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) throw parseSupabaseError(error);
      setSuccess(true);
      setTimeout(() => router.replace('/(customer)/home'), 1500);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    }
  }

  if (success) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>✅</Text>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 8 }}>تم تغيير كلمة المرور</Text>
        <Text style={{ color: '#6b7280', textAlign: 'center' }}>جاري تحويلك...</Text>
      </SafeAreaView>
    );
  }

  if (!ready) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <Text style={{ color: '#6b7280' }}>جاري التحقق...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 28, fontWeight: '700', color: '#111', marginBottom: 8 }}>
            إعادة تعيين كلمة المرور
          </Text>
          <Text style={{ color: '#6b7280', marginBottom: 32 }}>أدخل كلمة المرور الجديدة</Text>

          {errorMsg && (
            <View style={{ backgroundColor: '#fef2f2', borderRadius: 12, padding: 12, marginBottom: 16 }}>
              <Text style={{ color: '#dc2626', fontSize: 14 }}>{errorMsg}</Text>
            </View>
          )}

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="كلمة المرور الجديدة"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                secureTextEntry
                autoComplete="new-password"
              />
            )}
          />

          <Controller
            control={control}
            name="confirm"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="تأكيد كلمة المرور"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirm?.message}
                secureTextEntry
                autoComplete="new-password"
              />
            )}
          />

          <Button
            title="تعيين كلمة المرور"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            fullWidth
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
