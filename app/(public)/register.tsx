import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Image, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { registerSchema, RegisterFormValues } from '@/schemas/authSchema';
import { useRegister } from '@/hooks/useAuth';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const registerMutation = useRegister();

  // Commercial register document state
  const [docUri, setDocUri] = useState<string | null>(null);
  const [docName, setDocName] = useState<string>('');
  const [docMime, setDocMime] = useState<string>('image/jpeg');

  async function pickDocument() {
    // On web, Alert.alert is a no-op — go straight to file picker
    if (Platform.OS === 'web') {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setDocUri(asset.uri);
        setDocName(asset.name);
        setDocMime(asset.mimeType ?? 'application/pdf');
      }
      return;
    }

    // Native: show a choice
    Alert.alert(
      'السجل التجاري',
      'اختر طريقة رفع المستند',
      [
        {
          text: 'صورة من المعرض',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('الإذن مطلوب', 'يرجى السماح بالوصول إلى الصور');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.85,
            });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              setDocUri(asset.uri);
              setDocName(asset.fileName ?? 'commercial_register.jpg');
              setDocMime(asset.mimeType ?? 'image/jpeg');
            }
          },
        },
        {
          text: 'ملف PDF / صورة',
          onPress: async () => {
            const result = await DocumentPicker.getDocumentAsync({
              type: ['image/*', 'application/pdf'],
              copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              setDocUri(asset.uri);
              setDocName(asset.name);
              setDocMime(asset.mimeType ?? 'application/pdf');
            }
          },
        },
        { text: 'إلغاء', style: 'cancel' },
      ],
    );
  }

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', companyName: '', commercialRegisterNumber: '', phone: '', email: '', password: '', confirmPassword: '' },
  });

  async function onSubmit(values: RegisterFormValues) {
    if (!docUri) {
      Alert.alert('السجل التجاري مطلوب', 'يرجى رفع صورة السجل التجاري قبل إكمال التسجيل');
      return;
    }
    try {
      const result = await registerMutation.mutateAsync({
        ...values,
        commercialRegisterUri: docUri ?? undefined,
        commercialRegisterName: docName || undefined,
        commercialRegisterMime: docMime || undefined,
      });
      if ((result as any)?.needsConfirmation) {
        router.replace('/(public)/login?confirmed=1' as any);
      } else {
        router.replace('/(customer)/home');
      }
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
            name="companyName"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="اسم الشركة *"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.companyName?.message}
                placeholder="مثال: شركة أرض الشرق الحديثة"
              />
            )}
          />

          <Controller
            control={control}
            name="commercialRegisterNumber"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="رقم السجل التجاري *"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.commercialRegisterNumber?.message}
                placeholder="مثال: 123456789"
                keyboardType="default"
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

          {/* Commercial Register Upload */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
              السجل التجاري <Text style={{ color: '#ef4444' }}>*</Text>
            </Text>
            <TouchableOpacity
              onPress={pickDocument}
              style={{
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: docUri ? '#e36523' : '#d1d5db',
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: docUri ? '#fff7ed' : '#f9fafb',
              }}
            >
              <Ionicons
                name={docUri ? 'document-text' : 'cloud-upload-outline'}
                size={22}
                color={docUri ? '#e36523' : '#9ca3af'}
              />
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: docUri ? '#e36523' : '#6b7280',
                  fontWeight: docUri ? '600' : '400',
                }}
                numberOfLines={1}
              >
                {docUri ? docName || 'تم اختيار الملف' : 'رفع صورة السجل التجاري أو PDF'}
              </Text>
              {docUri && (
                <TouchableOpacity
                  onPress={() => { setDocUri(null); setDocName(''); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>

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

