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

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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
        } else {
          // Subsequent auth changes (sign in/out, token refresh)
          set({ session, isAuthenticated: !!session });
        }

        // Supabase calls made synchronously inside this callback can deadlock
        // GoTrueClient's internal session lock — most reliably on the very
        // first event fired during client initialization (e.g. a page
        // reload/back-forward restore with an existing session), which left
        // every query on the page hung forever waiting for the same lock.
        // Deferring escapes the callback's execution context.
        setTimeout(() => {
          if (session?.user) {
            fetchProfile(session.user.id);
          } else if (settled) {
            get().setProfile(null);
          }
        }, 0);
      });

      // Timeout fallback — if onAuthStateChange never fires (offline / Supabase down),
      // show login after 1.5 s instead of spinning forever.
      setTimeout(() => {
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
