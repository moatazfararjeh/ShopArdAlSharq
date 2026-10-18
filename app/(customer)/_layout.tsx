import { ActivityIndicator, View, Platform } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useCartStore } from '@/stores/cartStore';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/lib/theme';

const BRAND    = COLORS.brandText;
const INACTIVE = COLORS.muted;

// ── Tab icon: outline when idle, filled when active ──────────────────────────
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
    <Ionicons
      name={(focused ? focusedName : name) as any}
      size={23}
      color={focused ? BRAND : INACTIVE}
    />
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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: COLORS.canvas,
          borderTopWidth: 1,
          borderTopColor: COLORS.line,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 26 : 8,
          position: 'absolute',
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
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
        name="brands"
        options={{
          title: 'الماركات',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="pricetags-outline" focusedName="pricetags" focused={focused} />
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
            backgroundColor: COLORS.brandFill,
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
