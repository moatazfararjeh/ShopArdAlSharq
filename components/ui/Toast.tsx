import { useEffect, useRef } from 'react';
import { Animated, Text, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToastStore, ToastType } from '@/stores/toastStore';

const CONFIG: Record<ToastType, { bg: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string }> = {
  success: { bg: '#1c1917', icon: 'checkmark-circle', iconColor: '#4ade80' },
  error:   { bg: '#7f1d1d', icon: 'close-circle',     iconColor: '#f87171' },
  info:    { bg: '#1e3a5f', icon: 'information-circle', iconColor: '#60a5fa' },
};

const DURATION = 2500;

export function Toast() {
  const { visible, message, type, hide } = useToastStore();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      if (timer.current) clearTimeout(timer.current);
      Animated.parallel([
        Animated.spring(opacity, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 120, friction: 8 }),
      ]).start();
      timer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -20, duration: 250, useNativeDriver: true }),
        ]).start(() => hide());
      }, DURATION);
    }
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [visible, message]);

  const cfg = CONFIG[type];

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: Platform.OS === 'web' ? 24 : 60,
        left: 16,
        right: 16,
        zIndex: 9999,
        opacity,
        transform: [{ translateY }],
      }}
    >
      <View style={{
        backgroundColor: cfg.bg,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
        elevation: 8,
      }}>
        <Ionicons name={cfg.icon} size={20} color={cfg.iconColor} />
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 }}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}
