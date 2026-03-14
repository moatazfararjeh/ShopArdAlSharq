import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/models';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Derived
  isAuthenticated: boolean;
  isAdmin: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<() => void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  isLoading: true,
  isInitialized: false,
  isAuthenticated: false,
  isAdmin: false,

  setSession: (session) =>
    set({
      session,
      isAuthenticated: !!session,
    }),

  setProfile: (profile) =>
    set({
      profile,
      isAdmin: profile?.role === 'admin' || profile?.role === 'super_admin',
    }),

  setLoading: (isLoading) => set({ isLoading }),

  initialize: async () => {
    // Load current session on app start
    const {
      data: { session },
    } = await supabase.auth.getSession();

    set({
      session,
      isAuthenticated: !!session,
      isInitialized: true,
      isLoading: false,
    });

    // If we have a session, fetch the profile
    if (session?.user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (data) {
        get().setProfile(data as Profile);
      }
    }

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      set({
        session,
        isAuthenticated: !!session,
      });

      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        get().setProfile(data ? (data as Profile) : null);
      } else {
        get().setProfile(null);
      }
    });

    // Return unsubscribe function
    return () => subscription.unsubscribe();
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      session: null,
      profile: null,
      isAuthenticated: false,
      isAdmin: false,
    });
  },
}));
