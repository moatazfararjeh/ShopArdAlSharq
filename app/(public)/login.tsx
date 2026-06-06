import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { loginSchema, LoginFormValues } from '@/schemas/authSchema';
import { useLogin } from '@/hooks/useAuth';
import { useBiometric } from '@/hooks/useBiometric';
import { useState, useEffect } from 'react';

const REMEMBER_ME_KEY = 'remember_me_credentials';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const loginMutation = useLogin();
  const params = useLocalSearchParams<{ confirmed?: string }>();
  const showConfirmNotice = params.confirmed === '1';
  const { isAvailable, isEnabled, saveCredentials, getCredentials, getBiometricLabel, getBiometricIcon } = useBiometric();
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Load saved credentials on web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    AsyncStorage.getItem(REMEMBER_ME_KEY).then((stored) => {
      if (stored) {
        const { email, password } = JSON.parse(stored);
        setValue('email', email);
        setValue('password', password);
        setRememberMe(true);
      }
    }).catch(() => {});
  }, []);

  async function onSubmit(values: LoginFormValues) {
    try {
      await loginMutation.mutateAsync(values);
      // Offer to save credentials if biometrics available and not already enabled
      if (isAvailable && !isEnabled && Platform.OS !== 'web') {
        await saveCredentials(values.email, values.password);
      }
      // Save/clear credentials on web based on remember me
      if (Platform.OS === 'web') {
        if (rememberMe) {
          await AsyncStorage.setItem(REMEMBER_ME_KEY, JSON.stringify({ email: values.email, password: values.password }));
        } else {
          await AsyncStorage.removeItem(REMEMBER_ME_KEY);
        }
      }
      router.replace('/(customer)/home');
    } catch (err: unknown) {
      // Error displayed via mutation state
    }
  }

  async function handleBiometricLogin() {
    setBiometricLoading(true);
    try {
      const credentials = await getCredentials();
      if (credentials) {
        await loginMutation.mutateAsync(credentials);
        router.replace('/(customer)/home');
      }
    } catch {
      // Error displayed via mutation state
    } finally {
      setBiometricLoading(false);
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
          <Image source={require('@/assets/logo.png')} style={{ width: 340, height: 140, marginBottom: 16, alignSelf: 'center' }} resizeMode="contain" />

          {/* Hero features */}
          <View style={{ marginBottom: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1c1917', textAlign: 'center' }}>
              كل احتياجاتك مجمدة وموثوقة{"\n"}في مكان واحد
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 14 }}>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="car-outline" size={22} color="#e36523" />
                </View>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#5c4a35' }}>توصيل سريع</Text>
              </View>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="shield-checkmark-outline" size={22} color="#e36523" />
                </View>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#5c4a35' }}>جودة عالية</Text>
              </View>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="gift-outline" size={22} color="#e36523" />
                </View>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#5c4a35' }}>تشكيلة متنوعة</Text>
              </View>
            </View>
          </View>

          <Text style={{ fontSize: 22, fontWeight: '800', color: '#1c1917', marginBottom: 8 }}>{t('auth.login')}</Text>

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

          {/* Remember me + Forgot password row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: 4 }}>
            {Platform.OS === 'web' ? (
              <TouchableOpacity
                onPress={() => setRememberMe(!rememberMe)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                activeOpacity={0.7}
              >
                <View style={{
                  width: 20, height: 20, borderRadius: 4,
                  borderWidth: 1.5, borderColor: rememberMe ? '#e36523' : '#d1d5db',
                  backgroundColor: rememberMe ? '#e36523' : '#fff',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {rememberMe && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={{ fontSize: 13, color: '#5c4a35', fontWeight: '500' }}>تذكرني</Text>
              </TouchableOpacity>
            ) : <View />}
            <Button
              title={t('auth.forgotPassword')}
              variant="outline"
              size="sm"
              onPress={() => router.push('/(public)/forgot-password')}
            />
          </View>

          <Button
            title={t('auth.login')}
            onPress={handleSubmit(onSubmit)}
            isLoading={loginMutation.isPending}
            fullWidth
            size="lg"
          />

          {/* Biometric login button */}
          {isAvailable && isEnabled && Platform.OS !== 'web' && (
            <TouchableOpacity
              onPress={handleBiometricLogin}
              disabled={biometricLoading}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginTop: 16,
                paddingVertical: 14,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: '#e36523',
                backgroundColor: '#fff7ed',
                opacity: biometricLoading ? 0.6 : 1,
              }}
            >
              <Ionicons name={getBiometricIcon()} size={24} color="#e36523" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#e36523' }}>
                الدخول بـ{getBiometricLabel()}
              </Text>
            </TouchableOpacity>
          )}

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

