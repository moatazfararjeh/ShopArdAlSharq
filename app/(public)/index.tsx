import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator, Image, StyleSheet } from 'react-native';

export default function PublicIndex() {
  const { isAuthenticated, isInitialized } = useAuth();

  // onAuthStateChange fires in < 300ms so this is a very brief loading state.
  // Showing the logo here makes the transition from splash screen seamless.
  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#e36523" style={styles.spinner} />
      </View>
    );
  }

  // Declarative redirect — no useEffect / router.replace() race condition.
  if (isAuthenticated) {
    return <Redirect href="/(customer)/home" />;
  }
  return <Redirect href="/(public)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 180,
    height: 180,
  },
  spinner: {
    marginTop: 32,
  },
});
