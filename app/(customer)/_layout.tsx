import { ActivityIndicator, View, Platform } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useCartStore } from '@/stores/cartStore';
import { Ionicons } from '@expo/vector-icons';

const BRAND    = '#e36523';
const INACTIVE = '#b0a89e';

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
          backgroundColor: '#fff',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 72,
          paddingTop: 8,
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
      <Tabs.Screen name="catalog"         options={{ href: null }} />
      <Tabs.Screen name="delete-account"  options={{ href: null }} />
    </Tabs>
  );
}
