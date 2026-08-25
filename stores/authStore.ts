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
    if (get().isInitialized) return Promise.resolve(() => {});
    if (initPromise) return initPromise;

    initPromise = new Promise<() => void>((resolve) => {
      // `settled` = we know the session; unblock the loading screen immediately.
      // Profile fetch then happens in the background — it must never gate isInitialized.
      let settled = false;

      const settle = (session: Session | null) => {
        console.log('[DEBUG authStore] settle() called, hasSession=', !!session, 't=', Date.now());
        if (settled) return;
        settled = true;
        set({ session, isAuthenticated: !!session, isInitialized: true, isLoading: false });
      };

      const fetchProfile = async (userId: string) => {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          if (data) get().setProfile(data as Profile);
        } catch {
          // non-blocking
        }
      };

      console.log('[DEBUG authStore] initialize() called, setting up onAuthStateChange, t=', Date.now());
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[DEBUG authStore] onAuthStateChange fired, event=', event, 'hasSession=', !!session, 't=', Date.now());
        if (event === 'TOKEN_REFRESHED' && !session) {
          set({ session: null, isAuthenticated: false, profile: null, isAdmin: false });
          if (!settled) {
            settle(null);
            resolve(() => subscription.unsubscribe());
          }
          return;
        }

        if (!settled) {
          // Unblock the loading screen immediately, then fetch profile in background.
          settle(session);
          resolve(() => subscription.unsubscribe());
          if (session?.user) await fetchProfile(session.user.id);
        } else {
          // Subsequent auth changes (sign in/out, token refresh)
          set({ session, isAuthenticated: !!session });
          if (session?.user) {
            await fetchProfile(session.user.id);
          } else {
            get().setProfile(null);
          }
        }
      });

      // Timeout fallback — if onAuthStateChange never fires (offline / Supabase down),
      // show login after 1.5 s instead of spinning forever.
      setTimeout(() => {
        console.log('[DEBUG authStore] 1.5s timeout fired, settled=', settled, 't=', Date.now());
        if (!settled) {
          settle(null);
          resolve(() => subscription.unsubscribe());
        }
      }, 1500);
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
