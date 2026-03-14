import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { loginSchema, LoginFormValues } from '@/schemas/authSchema';
import { useLogin } from '@/hooks/useAuth';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const loginMutation = useLogin();
  const params = useLocalSearchParams<{ confirmed?: string }>();
  const showConfirmNotice = params.confirmed === '1';

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      await loginMutation.mutateAsync(values);
      router.replace('/(customer)/home');
    } catch (err: unknown) {
      // Error displayed via mutation state
    }
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
          <Image source={require('@/assets/logo.png')} style={{ width: 280, height: 110, marginBottom: 24, alignSelf: 'center' }} resizeMode="contain" />
          <Text className="mb-2 text-3xl font-bold text-gray-900">{t('auth.login')}</Text>

          {showConfirmNotice && (
            <View className="mb-4 rounded-xl bg-green-50 px-4 py-3">
              <Text className="text-sm text-green-700">
                تم إنشاء الحساب بنجاح. يرجى تأكيد بريدك الإلكتروني ثم تسجيل الدخول.
              </Text>
            </View>
          )}

          {loginMutation.error && (
            <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-600">
                {(loginMutation.error as Error).message}
              </Text>
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
                autoComplete="email"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label={t('auth.password')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                secureTextEntry
                autoComplete="current-password"
              />
            )}
          />

          <Button
            title={t('auth.forgotPassword')}
            variant="outline"
            size="sm"
            onPress={() => router.push('/(public)/forgot-password')}
            style={{ alignSelf: 'flex-end', marginBottom: 16 }}
          />

          <Button
            title={t('auth.login')}
            onPress={handleSubmit(onSubmit)}
            isLoading={loginMutation.isPending}
            fullWidth
            size="lg"
          />

          <View className="mt-6 flex-row items-center justify-center gap-2">
            <Text className="text-gray-500">{t('auth.noAccount')}</Text>
            <Button
              title={t('auth.register')}
              variant="outline"
              size="sm"
              onPress={() => router.push('/(public)/register')}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

