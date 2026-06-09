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

// Singleton promise to prevent concurrent initialization calls from racing
let initPromise: Promise<() => void> | null = null;

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

  initialize: () => {
    // Guard against double-initialization
    if (get().isInitialized) return Promise.resolve(() => {});

    // If initialization is already in progress, return the same promise
    // to avoid concurrent calls racing.
    if (initPromise) return initPromise;

    initPromise = new Promise<() => void>((resolve) => {
      let resolved = false;

      const finishInit = async (session: Session | null) => {
        if (resolved) return;
        resolved = true;

        try {
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
        } catch {
          // profile fetch failed — continue anyway
        }

        set({
          session,
          isAuthenticated: !!session,
          isInitialized: true,
          isLoading: false,
        });
      };

      // Use onAuthStateChange which fires INITIAL_SESSION without navigator.locks.
      // This avoids the hanging getSession() issue on web.
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!resolved) {
          // First event is always the initial session
          await finishInit(session);
          resolve(() => subscription.unsubscribe());
        } else {
          // Subsequent auth changes (sign in/out, token refresh)
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
        }
      });

      // Timeout fallback — if onAuthStateChange doesn't fire within 3s,
      // mark as initialized anyway so the app is never stuck loading.
      setTimeout(() => {
        if (!resolved) {
          finishInit(null);
          resolve(() => subscription.unsubscribe());
        }
      }, 3000);
    });

    return initPromise;
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore network errors — always clear local state so the user
      // is logged out even if the server is unreachable.
    }
    set({
      session: null,
      profile: null,
      isAuthenticated: false,
      isAdmin: false,
    });
  },
}));
