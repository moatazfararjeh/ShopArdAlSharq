import { useEffect, useRef } from 'react';
import {
  Animated, View, Text, TouchableOpacity, TouchableWithoutFeedback,
  PanResponder, Dimensions, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_H } = Dimensions.get('window');
const DRAG_DISMISS_THRESHOLD = 80;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Height as fraction of screen height, default 0.45 */
  heightFraction?: number;
  children: React.ReactNode;
  scrollable?: boolean;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  heightFraction = 0.45,
  children,
  scrollable = false,
}: BottomSheetProps) {
  const insets      = useSafeAreaInsets();
  const sheetHeight = SCREEN_H * heightFraction;
  const translateY  = useRef(new Animated.Value(sheetHeight)).current;
  const backdropOp  = useRef(new Animated.Value(0)).current;

  // ── Open / close animation ─────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 12,
        }),
        Animated.timing(backdropOp, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: sheetHeight,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOp, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // ── Drag-to-dismiss ───────────────────────────────────────────────────────
  const dragY    = useRef(new Animated.Value(0)).current;
  const startDragY = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4,
      onPanResponderGrant: (_, g) => {
        startDragY.current = g.y0;
        dragY.setValue(0);
      },
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) dragY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DRAG_DISMISS_THRESHOLD) {
          dragY.setValue(0);
          onClose();
        } else {
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true, tension: 120, friction: 10 }).start();
        }
      },
    }),
  ).current;

  if (!visible && Platform.OS !== 'web') {
    // Keep rendered on web for transition; on native unmount when hidden
    // Actually keep rendered always so animation plays
  }

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 999,
        opacity: backdropOp,
      }}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(28,25,23,0.5)',
        }} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0, right: 0, bottom: 0,
          height: sheetHeight + insets.bottom,
          backgroundColor: '#fff',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          transform: [
            { translateY: Animated.add(translateY, dragY) },
          ],
          shadowColor: '#1c1917',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.12,
          shadowRadius: 20,
          elevation: 20,
        }}
      >
        {/* Drag handle */}
        <View
          {...panResponder.panHandlers}
          style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}
        >
          <View style={{
            width: 36, height: 4, borderRadius: 2,
            backgroundColor: '#d1c9bf',
          }} />
        </View>

        {/* Title */}
        {!!title && (
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20, paddingVertical: 12,
            borderBottomWidth: 1, borderBottomColor: '#f0ece6',
            direction: 'rtl' as any,
          }}>
            <Text style={{
              fontSize: 17, fontWeight: '800', color: '#1c1917',
            }}>
              {title}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                width: 30, height: 30, borderRadius: 15,
                backgroundColor: '#f5f0eb',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 16, color: '#6b5c4e', lineHeight: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        {scrollable ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, paddingBottom: insets.bottom }}>
            {children}
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

// ─── Option row — commonly used inside bottom sheets ─────────────────────────
export function SheetOption({
  label, sublabel, selected, onPress, iconLeft,
}: {
  label: string;
  sublabel?: string;
  selected?: boolean;
  onPress: () => void;
  iconLeft?: React.ReactNode;
}) {
  const BRAND = '#e36523';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#f5f0eb',
        direction: 'rtl' as any, gap: 14,
        backgroundColor: selected ? '#fff7ed' : '#fff',
      }}
    >
      {!!iconLeft && iconLeft}
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 15, fontWeight: selected ? '800' : '600',
          color: selected ? BRAND : '#1c1917',
          textAlign: 'right',
        }}>
          {label}
        </Text>
        {!!sublabel && (
          <Text style={{ fontSize: 12, color: '#a09284', marginTop: 1, textAlign: 'right' }}>
            {sublabel}
          </Text>
        )}
      </View>
      {selected && (
        <View style={{
          width: 22, height: 22, borderRadius: 11,
          backgroundColor: BRAND,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 12, color: '#fff', fontWeight: '900' }}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
