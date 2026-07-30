import { ActivityIndicator, View, Platform, Animated, TouchableOpacity } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useCartStore } from '@/stores/cartStore';
import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';

const BRAND    = '#e36523';
const INACTIVE = '#b0a89e';

// ── Animated press wrapper ────────────────────────────────────────────────────
function AnimatedTabButton({ children, onPress, onLongPress, style, accessibilityState, ...rest }: any) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.22, useNativeDriver: true, speed: 60, bounciness: 16 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 20, bounciness: 6  }),
    ]).start();
    onPress?.();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={onLongPress}
      style={[style, { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: Platform.OS === 'ios' ? 20 : 8, overflow: 'visible' }]}
      activeOpacity={1}
      {...rest}
    >
      <Animated.View style={{ transform: [{ scale }], overflow: 'visible' }}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Tab icon: floating bubble when active ─────────────────────────────────────
function TabIcon({
  name,
  focusedName,
  focused,
}: {
  name: string;
  focusedName: string;
  focused: boolean;
}) {
  if (focused) {
    return (
      <View style={{
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 28,          // lifts the bubble above the tab bar top border
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 10,
        elevation: 10,
      }}>
        <Ionicons name={focusedName as any} size={26} color={BRAND} />
      </View>
    );
  }
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 46, height: 30 }}>
      <Ionicons name={name as any} size={22} color={INACTIVE} />
    </View>
  );
}

export default function CustomerLayout() {
  const { isAuthenticated, isInitialized } = useAuth();
  const { t } = useTranslation();
  const itemCount = useCartStore((s) => s.summary.itemCount);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(public)/login" />;
  }

  const tabButton = (props: any) => <AnimatedTabButton {...props} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND,
        tabBarInactiveTintColor: INACTIVE,
        tabBarButton: tabButton,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 3,
          borderTopColor: BRAND,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          height: Platform.OS === 'ios' ? 90 : 74,
          paddingTop: 0,
          paddingBottom: 0,
          position: 'absolute',
          overflow: 'visible',
          elevation: 20,
          shadowColor: '#1c1917',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.10,
          shadowRadius: 20,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarItemStyle: {
          overflow: 'visible',
          paddingTop: 0,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home-outline" focusedName="home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'المفضلة',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="heart-outline" focusedName="heart" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'السلة',
          tabBarBadge: itemCount > 0 ? itemCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: BRAND,
            color: '#fff',
            fontSize: 10,
            fontWeight: '700',
            minWidth: 18,
            height: 18,
          },
          tabBarIcon: ({ focused }) => (
            <TabIcon name="bag-outline" focusedName="bag" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders/index"
        options={{
          title: 'طلباتي',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="receipt-outline" focusedName="receipt" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="person-outline" focusedName="person" focused={focused} />
          ),
        }}
      />

      {/* Hidden screens — not tabs */}
      <Tabs.Screen name="search"          options={{ href: null }} />
      <Tabs.Screen name="notifications"   options={{ href: null }} />
      <Tabs.Screen name="checkout"        options={{ href: null }} />
      <Tabs.Screen name="order-success"   options={{ href: null }} />
      <Tabs.Screen name="orders/[id]"     options={{ href: null }} />
      <Tabs.Screen name="addresses"       options={{ href: null }} />
      <Tabs.Screen name="edit-address"    options={{ href: null }} />
      <Tabs.Screen name="contact"         options={{ href: null }} />
      <Tabs.Screen name="catalog"         options={{ href: null }} />
      <Tabs.Screen name="delete-account"  options={{ href: null }} />
      <Tabs.Screen name="change-password" options={{ href: null }} />
    </Tabs>
  );
}
