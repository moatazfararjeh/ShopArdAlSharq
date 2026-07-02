import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Image } from 'expo-image';

const SPLASH_DURATION = 10000; // 10 seconds

export default function PublicIndex() {
  const { isAuthenticated, isInitialized } = useAuth();
  const router = useRouter();
  const [splashDone, setSplashDone] = useState(false);

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
      <Image
        source={require('@/assets/splash-screen.png')}
        style={styles.image}
        contentFit="cover"
      />
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.8}>
        <Text style={styles.skipText}>تخطي</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8f0f8',
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    left: 20,
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
