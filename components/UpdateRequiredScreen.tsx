import { View, Text, Image, TouchableOpacity, Linking, StyleSheet } from 'react-native';

const BRAND = '#e36523';

export function UpdateRequiredScreen({ storeUrl, message }: { storeUrl: string; message: string }) {
  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>تحديث مطلوب</Text>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity style={styles.button} onPress={() => Linking.openURL(storeUrl)} activeOpacity={0.85}>
        <Text style={styles.buttonText}>تحديث الآن</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1c1917',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: '#5c4a35',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  button: {
    backgroundColor: BRAND,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
