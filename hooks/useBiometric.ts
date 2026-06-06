import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const CREDENTIALS_KEY = 'biometric_credentials';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

interface StoredCredentials {
  email: string;
  password: string;
}

export function useBiometric() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'facial' | 'iris' | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    checkBiometricAvailability();
  }, []);

  async function checkBiometricAvailability() {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsAvailable(compatible && enrolled);

      if (compatible && enrolled) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('facial');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('fingerprint');
        } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          setBiometricType('iris');
        }
      }

      // Check if biometric login is enabled
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      setIsEnabled(enabled === 'true');
    } catch {
      setIsAvailable(false);
    }
  }

  const saveCredentials = useCallback(async (email: string, password: string): Promise<boolean> => {
    if (Platform.OS === 'web') return false;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'تأكيد حفظ بيانات الدخول',
        cancelLabel: 'إلغاء',
        disableDeviceFallback: false,
      });

      if (result.success) {
        const credentials: StoredCredentials = { email, password };
        await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify(credentials));
        await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
        setIsEnabled(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const getCredentials = useCallback(async (): Promise<StoredCredentials | null> => {
    if (Platform.OS === 'web') return null;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'تسجيل الدخول بالبصمة',
        cancelLabel: 'إلغاء',
        disableDeviceFallback: false,
      });

      if (result.success) {
        const stored = await SecureStore.getItemAsync(CREDENTIALS_KEY);
        if (stored) {
          return JSON.parse(stored) as StoredCredentials;
        }
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const clearCredentials = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      setIsEnabled(false);
    } catch {
      // Silently fail
    }
  }, []);

  const getBiometricLabel = useCallback(() => {
    if (biometricType === 'facial') return 'Face ID';
    if (biometricType === 'iris') return 'Iris';
    return 'البصمة';
  }, [biometricType]);

  const getBiometricIcon = useCallback((): 'finger-print' | 'scan-outline' => {
    if (biometricType === 'facial') return 'scan-outline';
    return 'finger-print';
  }, [biometricType]);

  return {
    isAvailable,
    isEnabled,
    biometricType,
    saveCredentials,
    getCredentials,
    clearCredentials,
    getBiometricLabel,
    getBiometricIcon,
  };
}
