import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { forgotPasswordSchema, ForgotPasswordFormValues } from '@/schemas/authSchema';
import { useForgotPassword } from '@/hooks/useAuth';
import { setResetEmailDraft } from '@/lib/passwordResetDraft';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(public)/login');
  }
  const mutation = useForgotPassword();
  const [sent, setSent] = useState(false);

  const { control, handleSubmit, getValues, formState: { errors } } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  // Open the code form (email + 6-digit code from the reset email + new password)
  function enterCode() {
    setResetEmailDraft(getValues('email') ?? '');
    router.push({ pathname: '/(public)/reset-password', params: { mode: 'code' } } as any);
  }

  async function onSubmit(values: ForgotPasswordFormValues) {
    await mutation.mutateAsync(values.email);
    setSent(true);
  }

  if (sent) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-6">
        <Text className="mb-4 text-5xl">📧</Text>
        <Text className="mb-2 text-xl font-bold text-gray-900">{t('auth.sendResetLink')}</Text>
        <Text className="mb-8 text-center text-gray-500">{t('auth.resetEmailSent')}</Text>
        <Button title="لديك رمز؟ أدخله هنا" onPress={enterCode} fullWidth size="lg" />
        <Button
          title={t('auth.login')}
          variant="outline"
          onPress={() => router.replace('/(public)/login')}
          fullWidth
          size="md"
          style={{ marginTop: 12 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-2 text-3xl font-bold text-gray-900">{t('auth.forgotPassword')}</Text>
          <Text className="mb-8 text-gray-500">أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور</Text>

          {mutation.error && (
            <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-600">{(mutation.error as Error).message}</Text>
            </View>
          )}

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label={t('auth.email')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}
          />

          <Button
            title={t('auth.sendResetLink')}
            onPress={handleSubmit(onSubmit)}
            isLoading={mutation.isPending}
            fullWidth
            size="lg"
          />

          <Button
            title={t('common.back')}
            variant="outline"
            onPress={() => goBack()}
            fullWidth
            size="md"
            style={{ marginTop: 12 }}
          />

          <TouchableOpacity onPress={enterCode} style={{ marginTop: 18, alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ color: '#B9460F', fontWeight: '600', fontSize: 14 }}>لديك رمز؟ أدخله هنا</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

