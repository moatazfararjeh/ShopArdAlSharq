import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { Database } from '@/types/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Check your .env file.',
  );
}

// During `expo export` static rendering, code runs in Node.js where
// `localStorage` is undefined even though Platform.OS === 'web'.
// Fall back to a no-op adapter for that SSR phase; the browser will use
// the real localStorage at runtime.
const getWebStorage = () => {
  if (typeof localStorage !== 'undefined') return localStorage;
  // No-op storage for SSR / static-render environment
  return {
    getItem: (_key: string) => null as string | null,
    setItem: (_key: string, _value: string) => {},
    removeItem: (_key: string) => {},
  };
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? getWebStorage() : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
