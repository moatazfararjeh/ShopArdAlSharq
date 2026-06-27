import { ActivityIndicator, View, Platform } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useCartStore } from '@/stores/cartStore';
import { Ionicons } from '@expo/vector-icons';

const ACTIVE_COLOR = '#e36523';
const INACTIVE_COLOR = '#857d78';

export default function CustomerLayout() {
  const { isAuthenticated, isInitialized } = useAuth();

  const { t } = useTranslation();
  const itemCount = useCartStore((s) => s.summary.itemCount);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={ACTIVE_COLOR} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(public)/login" />;
  }
  // Note: catalog is accessible without login via web layout bypass

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 3,
          borderTopColor: ACTIVE_COLOR,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          height: Platform.OS === 'ios' ? 85 : 70,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          position: 'absolute',
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ focused, size }) => (
            <View
              style={
                focused
                  ? {
                      backgroundColor: '#FFFFFF',
                      borderRadius: 30,
                      width: 50,
                      height: 50,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginTop: -25,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.15,
                      shadowRadius: 6,
                      elevation: 6,
                    }
                  : { justifyContent: 'center', alignItems: 'center' }
              }
            >
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={focused ? 26 : size}
                color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'المفضلة',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? 'heart' : 'heart-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'السلة',
          tabBarBadge: itemCount > 0 ? itemCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#e36523', color: '#fff', fontSize: 10, fontWeight: '700', minWidth: 18, height: 18 },
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? 'bag' : 'bag-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders/index"
        options={{
          title: 'طلباتي',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? 'receipt' : 'receipt-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      {/* Hidden screens — not tabs */}
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="checkout" options={{ href: null }} />
      <Tabs.Screen name="order-success" options={{ href: null }} />
      <Tabs.Screen name="orders/[id]" options={{ href: null }} />
      <Tabs.Screen name="addresses" options={{ href: null }} />
      <Tabs.Screen name="edit-address" options={{ href: null }} />
      <Tabs.Screen name="contact" options={{ href: null }} />
      <Tabs.Screen name="catalog" options={{ href: null }} />
      <Tabs.Screen name="delete-account" options={{ href: null }} />
    </Tabs>
  );
}


