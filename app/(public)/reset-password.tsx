import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { parseSupabaseError } from '@/lib/errors';

// Two ways to reset:
//  - 'link': the email link worked → Supabase opened a recovery session, just set the password.
//  - 'code': the link was expired / already used (email security scanners often
//    "click" it first) or there was no link → verify the 6-digit code from the
//    same email, then set the password. Codes aren't consumed by link scanners.
type Mode = 'checking' | 'link' | 'code';

const passwordFields = {
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  confirm: z.string(),
};
const linkSchema = z.object(passwordFields)
  .refine((v) => v.password === v.confirm, { message: 'كلمة المرور غير متطابقة', path: ['confirm'] });
const codeSchema = z.object({
  email: z.string().trim().email('البريد الإلكتروني غير صحيح'),
  code: z.string().trim().regex(/^\d{6}$/, 'الرمز مكوّن من 6 أرقام'),
  ...passwordFields,
}).refine((v) => v.password === v.confirm, { message: 'كلمة المرور غير متطابقة', path: ['confirm'] });

type FormValues = { email?: string; code?: string; password: string; confirm: string };

function linkErrorFromUrl(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, '') || window.location.search);
  return params.get('error_code') ?? params.get('error');
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(() => (linkErrorFromUrl() ? 'code' : 'checking'));
  const [linkFailed] = useState(() => !!linkErrorFromUrl());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  // The resolver reads the mode at validation time (mode can change after mount)
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: (values, ctx, opts) =>
      zodResolver((modeRef.current === 'code' ? codeSchema : linkSchema) as any)(values, ctx, opts as any),
    defaultValues: { email: '', code: '', password: '', confirm: '' },
  });

  // Valid link → Supabase reads #access_token=…&type=recovery and fires
  // PASSWORD_RECOVERY. Otherwise, after a short wait, fall back to the code form.
  useEffect(() => {
    if (mode !== 'checking') return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('link');
    });
    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setMode((m) => (m === 'checking' ? (data.session ? 'link' : 'code') : m));
    }, 2000);
    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [mode]);

  async function onSubmit(values: FormValues) {
    setErrorMsg(null);
    try {
      if (mode === 'code') {
        const { error: otpError } = await supabase.auth.verifyOtp({
          email: values.email!.trim().toLowerCase(),
          token: values.code!.trim(),
          type: 'recovery',
        });
        if (otpError) {
          setErrorMsg('الرمز غير صحيح أو منتهي الصلاحية. اطلب رابطاً جديداً واستخدم أحدث بريد وصلك.');
          return;
        }
      }
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

  if (mode === 'checking') {
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
          <Text style={{ color: '#6b7280', marginBottom: 24, lineHeight: 22 }}>
            {mode === 'link'
              ? 'أدخل كلمة المرور الجديدة'
              : 'أدخل بريدك الإلكتروني والرمز المكوّن من 6 أرقام الموجود في رسالة إعادة التعيين، ثم كلمة المرور الجديدة.'}
          </Text>

          {mode === 'code' && linkFailed && (
            <View style={{ backgroundColor: '#FFF8E6', borderRadius: 12, padding: 12, marginBottom: 16 }}>
              <Text style={{ color: '#6B4500', fontSize: 14, lineHeight: 21 }}>
                رابط إعادة التعيين منتهي الصلاحية أو تم استخدامه. يمكنك إكمال العملية بالرمز الموجود في نفس الرسالة.
              </Text>
            </View>
          )}

          {errorMsg && (
            <View style={{ backgroundColor: '#fef2f2', borderRadius: 12, padding: 12, marginBottom: 16 }}>
              <Text style={{ color: '#dc2626', fontSize: 14, lineHeight: 21 }}>{errorMsg}</Text>
            </View>
          )}

          {mode === 'code' && (
            <>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input
                    label="البريد الإلكتروني"
                    value={value ?? ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.email?.message}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                  />
                )}
              />
              <Controller
                control={control}
                name="code"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input
                    label="رمز التحقق (6 أرقام)"
                    value={value ?? ''}
                    onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 6))}
                    onBlur={onBlur}
                    error={errors.code?.message}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    style={{ letterSpacing: 6, textAlign: 'center', fontSize: 20 }}
                  />
                )}
              />
            </>
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
            isLoading={isSubmitting}
            fullWidth
            style={{ marginTop: 8 }}
          />

          {mode === 'code' && (
            <TouchableOpacity
              onPress={() => router.replace('/(public)/forgot-password' as any)}
              style={{ marginTop: 18, alignItems: 'center', paddingVertical: 8 }}
            >
              <Text style={{ color: '#B9460F', fontWeight: '600', fontSize: 14 }}>
                لم يصلك رمز؟ اطلب رابطاً جديداً
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
