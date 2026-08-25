import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { Database } from '@/types/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Check your .env file.',
  );
}

// Matches the key supabase-js derives from the URL host (sb-<host>-auth-token).
// Pinned explicitly so native cold-start clearing below can't drift from it.
const AUTH_STORAGE_KEY = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;

// During `expo export` static rendering, code runs in Node.js where
// `sessionStorage` is undefined even though Platform.OS === 'web'.
// Fall back to a no-op adapter for that SSR phase; the browser will use
// the real sessionStorage at runtime.
//
// sessionStorage (not localStorage) is deliberate: it survives page
// refreshes within a tab but is wiped by the browser when the tab/window
// closes, so closing the browser always forces a fresh login + refetch.
const getWebStorage = () => {
  if (typeof sessionStorage !== 'undefined') return sessionStorage;
  // No-op storage for SSR / static-render environment
  return {
    getItem: (_key: string) => null as string | null,
    setItem: (_key: string, _value: string) => {},
    removeItem: (_key: string) => {},
  };
};

// AsyncStorage persists to disk regardless of app lifecycle, so unlike
// sessionStorage it can't auto-clear on "close". Instead, wipe the auth
// token the first time it's read after a cold start (module init only runs
// once per process launch — backgrounding/resuming the app does not
// re-trigger it), forcing a fresh login + data reload each time the app is
// actually closed and reopened.
const getNativeStorage = () => {
  let clearedOnBoot = false;
  return {
    getItem: async (key: string) => {
      if (!clearedOnBoot) {
        clearedOnBoot = true;
        if (key === AUTH_STORAGE_KEY) {
          await AsyncStorage.removeItem(key);
          return null;
        }
      }
      return AsyncStorage.getItem(key);
    },
    setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
    removeItem: (key: string) => AsyncStorage.removeItem(key),
  };
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: AUTH_STORAGE_KEY,
    storage: Platform.OS === 'web' ? getWebStorage() : getNativeStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// RN's JS timers are throttled/suspended while backgrounded, so the
// autoRefreshToken timer can miss a refresh while the app is away. Without
// this, resuming the app can silently run on an expired session (empty data,
// no redirect to login) until something else happens to touch auth state.
// Pausing/resuming it around app foreground/background, per Supabase's own
// React Native guidance, forces a fresh check on resume: a valid session
// refreshes, an expired one fires SIGNED_OUT, and the existing route guards
// (app/(customer)/_layout.tsx, app/(admin)/_layout.tsx) redirect to login.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
