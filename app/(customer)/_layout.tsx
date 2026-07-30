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
      Animated.spring(scale, { toValue: 1.28, useNativeDriver: true, speed: 60, bounciness: 14 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 20, bounciness: 6  }),
    ]).start();
    onPress?.();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={onLongPress}
      style={[style, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}
      activeOpacity={1}
      {...rest}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Tab icon with active top-border indicator ─────────────────────────────────
function TabIcon({
  name,
  focusedName,
  focused,
}: {
  name: string;
  focusedName: string;
  focused: boolean;
}) {
  return (
    <View style={{ alignItems: 'center' }}>
      {/* Orange bar above active icon */}
      <View style={{
        width: 36,
        height: 3,
        borderRadius: 2,
        backgroundColor: focused ? BRAND : 'transparent',
        marginBottom: 4,
      }} />
      <View style={{
        backgroundColor: focused ? '#fff7ed' : 'transparent',
        borderRadius: 14,
        width: 46,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Ionicons
          name={(focused ? focusedName : name) as any}
          size={22}
          color={focused ? BRAND : INACTIVE}
        />
      </View>
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
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 72,
          paddingTop: 0,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          position: 'absolute',
          elevation: 20,
          shadowColor: '#1c1917',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.08,
          shadowRadius: 24,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 2,
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
      <Tabs.Screen name="catalog"          options={{ href: null }} />
      <Tabs.Screen name="delete-account"  options={{ href: null }} />
      <Tabs.Screen name="change-password" options={{ href: null }} />
    </Tabs>
  );
}
