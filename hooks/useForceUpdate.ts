import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useQuery } from '@tanstack/react-query';
import { getAppVersionConfig } from '@/services/appVersionService';
import { isVersionBelow } from '@/utils/compareVersions';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/constants';

const DEFAULT_MESSAGE = 'يتوفر إصدار جديد من التطبيق. يرجى التحديث للمتابعة.';

export function useForceUpdate() {
  const { data, isError } = useQuery({
    queryKey: ['app-version-config'],
    queryFn: getAppVersionConfig,
    enabled: Platform.OS !== 'web',
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // Fail open: a fetch error/timeout must never block access to the app.
  if (Platform.OS === 'web' || isError || !data) {
    return { needsUpdate: false as const, storeUrl: '', message: '' };
  }

  const currentVersion = Constants.expoConfig?.version ?? '0.0.0';
  const minVersion = Platform.OS === 'ios' ? data.ios_min_version : data.android_min_version;
  const needsUpdate = isVersionBelow(currentVersion, minVersion);
  const storeUrl = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;

  return {
    needsUpdate,
    storeUrl,
    message: data.update_message_ar || DEFAULT_MESSAGE,
  };
}
