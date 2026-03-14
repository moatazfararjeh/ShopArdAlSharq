import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { registerSchema, RegisterFormValues } from '@/schemas/authSchema';
import { useRegister } from '@/hooks/useAuth';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const registerMutation = useRegister();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', phone: '', email: '', password: '', confirmPassword: '' },
  });

  async function onSubmit(values: RegisterFormValues) {
    try {
      await registerMutation.mutateAsync(values);
      router.replace('/(customer)/home');
    } catch {
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
          <Text className="mb-2 text-3xl font-bold text-gray-900">{t('auth.register')}</Text>

          {registerMutation.error && (
            <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-600">
                {(registerMutation.error as Error).message}
              </Text>
            </View>
          )}

          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label={t('auth.fullName')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.fullName?.message}
                autoComplete="name"
              />
            )}
          />

          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label={t('auth.phone')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.phone?.message}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
            )}
          />

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
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label={t('auth.confirmPassword')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirmPassword?.message}
                secureTextEntry
              />
            )}
          />

          <Button
            title={t('auth.register')}
            onPress={handleSubmit(onSubmit)}
            isLoading={registerMutation.isPending}
            fullWidth
            size="lg"
          />

          <View className="mt-6 flex-row items-center justify-center gap-2">
            <Text className="text-gray-500">{t('auth.hasAccount')}</Text>
            <Button
              title={t('auth.login')}
              variant="outline"
              size="sm"
              onPress={() => router.push('/(public)/login')}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

