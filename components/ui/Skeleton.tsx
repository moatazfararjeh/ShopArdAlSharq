import { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle } from 'react-native';

// ─── Base skeleton bar ────────────────────────────────────────────────────────
export function Skeleton({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width?: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 750, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width ?? '100%',
          height,
          borderRadius,
          backgroundColor: '#e6ddd4',
          opacity,
        },
        style,
      ]}
    />
  );
}

// ─── Product card skeleton ────────────────────────────────────────────────────
export function ProductCardSkeleton({ width }: { width?: number }) {
  return (
    <View style={{
      width: width ?? 160,
      borderRadius: 20,
      backgroundColor: '#fff',
      shadowColor: '#1c1917',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 3,
      overflow: 'hidden',
    }}>
      {/* Image area — 3:4 ratio */}
      <Skeleton height={width ? width * (4 / 3) : 213} borderRadius={0} />
      {/* Info area */}
      <View style={{ padding: 11, gap: 7 }}>
        <Skeleton width="40%" height={9} borderRadius={5} />
        <Skeleton width="90%" height={12} borderRadius={5} />
        <Skeleton width="70%" height={12} borderRadius={5} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, alignItems: 'center' }}>
          <Skeleton width={56} height={14} borderRadius={5} />
          <Skeleton width={34} height={34} borderRadius={12} />
        </View>
      </View>
    </View>
  );
}

// ─── Horizontal skeleton row (for carousel sections) ──────────────────────────
export function ProductRowSkeleton({ cardWidth, count = 3 }: { cardWidth: number; count?: number }) {
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 14 }}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} width={cardWidth} />
      ))}
    </View>
  );
}

// ─── Section header skeleton ──────────────────────────────────────────────────
export function SectionHeaderSkeleton() {
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 14, gap: 8 }}>
      <Skeleton width="50%" height={20} borderRadius={6} />
      <Skeleton width={36} height={3} borderRadius={2} />
    </View>
  );
}

// ─── Banner skeleton ──────────────────────────────────────────────────────────
export function BannerSkeleton({ width, height = 320 }: { width: number; height?: number }) {
  return <Skeleton width={width} height={height} borderRadius={0} />;
}

// ─── Wishlist item skeleton ───────────────────────────────────────────────────
export function WishlistItemSkeleton() {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#fff', borderRadius: 20,
      marginHorizontal: 16, marginVertical: 6,
      padding: 12,
      shadowColor: '#1c1917', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    }}>
      <Skeleton width={80} height={80} borderRadius={14} />
      <View style={{ flex: 1, marginHorizontal: 12, gap: 8 }}>
        <Skeleton width="80%" height={13} borderRadius={5} />
        <Skeleton width="55%" height={13} borderRadius={5} />
        <Skeleton width={90} height={18} borderRadius={10} />
      </View>
      <Skeleton width={34} height={34} borderRadius={17} />
    </View>
  );
}

// ─── Notification row skeleton ────────────────────────────────────────────────
export function NotificationRowSkeleton() {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'flex-start',
      paddingHorizontal: 16, paddingVertical: 14,
      backgroundColor: '#fff',
      borderBottomWidth: 1, borderBottomColor: '#f0ece8',
      gap: 12,
    }}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={{ flex: 1, gap: 7 }}>
        <Skeleton width="70%" height={13} borderRadius={5} />
        <Skeleton width="90%" height={12} borderRadius={5} />
        <Skeleton width={80} height={10} borderRadius={5} />
      </View>
    </View>
  );
}

// ─── Order card skeleton ──────────────────────────────────────────────────────
export function OrderCardSkeleton() {
  return (
    <View style={{
      marginHorizontal: 16, marginVertical: 7,
      backgroundColor: '#fff', borderRadius: 20, padding: 16,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
      gap: 10,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width={80} height={14} borderRadius={5} />
        <Skeleton width={70} height={24} borderRadius={20} />
      </View>
      <Skeleton width={120} height={11} borderRadius={5} />
      <View style={{ height: 1, backgroundColor: '#f3f4f6' }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width={70} height={24} borderRadius={20} />
        <Skeleton width={90} height={16} borderRadius={5} />
      </View>
    </View>
  );
}
