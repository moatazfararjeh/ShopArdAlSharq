import { Platform, Share } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * Copy text. Returns true when it went to the clipboard.
 *
 * expo-clipboard is native code, so phones on a store build from before it
 * was added (which still get this JS by OTA) don't have it. There we open the
 * share sheet instead — it has a "Copy" action — and return false.
 */
export async function copyText(text: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      window.prompt('انسخ النص:', text);
      return false;
    }
  }

  if (requireOptionalNativeModule('ExpoClipboard')) {
    const Clipboard = require('expo-clipboard') as typeof import('expo-clipboard');
    await Clipboard.setStringAsync(text);
    return true;
  }

  await Share.share({ message: text });
  return false;
}
