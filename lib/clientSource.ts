import { Platform } from 'react-native';
import Constants from 'expo-constants';

export type ClientSource = 'web' | 'ios' | 'android';

/**
 * Where the app is running and which version, recorded on orders and sign-ups.
 * Phones: "1.9.0 (44)" — the running JS version (OTA updates change it), then
 * the store build number. Web: "1.9.0".
 */
export function getClientSource(): { source: ClientSource; appVersion: string | null } {
  const version = Constants.expoConfig?.version ?? null;
  if (Platform.OS === 'ios') {
    const build = Constants.platform?.ios?.buildNumber;
    return { source: 'ios', appVersion: version && build ? `${version} (${build})` : version };
  }
  if (Platform.OS === 'android') {
    const build = Constants.platform?.android?.versionCode;
    return { source: 'android', appVersion: version && build ? `${version} (${build})` : version };
  }
  return { source: 'web', appVersion: version };
}
