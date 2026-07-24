import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SPLASH_DURATION = 10000; // 10 seconds

export default function PublicIndex() {
  const { isAuthenticated, isInitialized } = useAuth();
  const router = useRouter();
  const [splashDone, setSplashDone] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), SPLASH_DURATION);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!splashDone || !isInitialized) return;
    if (isAuthenticated) {
      router.replace('/(customer)/home');
    } else {
      router.replace('/(public)/login');
    }
  }, [splashDone, isAuthenticated, isInitialized]);

  function handleSkip() {
    setSplashDone(true); // ensures the effect fires as soon as auth is ready
    if (!isInitialized) return; // auth not done yet — effect will navigate when ready
    if (isAuthenticated) {
      router.replace('/(customer)/home');
    } else {
      router.replace('/(public)/login');
    }
  }

  return (
    <View style={styles.container}>
      {/* Wrap image in a View with pointerEvents="none" — expo-image does not
          reliably forward this prop to the underlying DOM element on web,
          which causes the image to swallow all touch events. A plain View
          node always sets pointer-events correctly on every platform. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image
          source={require('@/assets/splash-screen.png')}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />
      </View>
      <Pressable
        style={[styles.skipButton, { top: insets.top + 12 }]}
        onPress={handleSkip}
        hitSlop={12}
      >
        <Text style={styles.skipText}>تخطي</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8f0f8',
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 999,
    cursor: 'pointer' as any,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'NotoSansArabic-Regular',
  },
});
