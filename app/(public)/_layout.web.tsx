import { View } from 'react-native';
import { Stack } from 'expo-router';

/**
 * On web, auth screens are shown as a centered card (max 480 px) over a warm
 * off-white background, keeping the mobile form layout without stretching it
 * awkwardly to full desktop width.
 */
export default function PublicWebLayout() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#f8f7f5',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: 480,
          flex: 1,
          backgroundColor: '#fff',
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 32,
          shadowOffset: { width: 0, height: 4 },
          overflow: 'hidden' as any,
        }}
      >
        <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
      </View>
    </View>
  );
}
