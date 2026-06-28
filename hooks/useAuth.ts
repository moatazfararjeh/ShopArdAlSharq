import { useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import * as authService from '@/services/authService';
import { LoginFormValues, RegisterFormValues } from '@/schemas/authSchema';

export function useAuth() {
  const store = useAuthStore();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!store.isInitialized) {
      store.initialize().then((unsubscribe) => {
        cleanupRef.current = unsubscribe;
      });
    }
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return {
    session: store.session,
    profile: store.profile,
    isAuthenticated: store.isAuthenticated,
    isAdmin: store.isAdmin,
    isLoading: store.isLoading,
    isInitialized: store.isInitialized,
  };
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);

  return useMutation({
    mutationFn: (values: LoginFormValues) =>
      authService.signIn(values.email, values.password),
    onSuccess: async (data) => {
      // Immediately update auth store so navigation to protected routes works
      // without waiting for the async onAuthStateChange event.
      if (data.session) {
        setSession(data.session);
      }
      if (data.userId) {
        try {
          const profile = await authService.getProfile(data.userId);
          setProfile(profile);
        } catch {
          // Profile fetch failure is non-blocking
        }
      }
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (values: RegisterFormValues) =>
      authService.signUp(
        values.email,
        values.password,
        values.fullName,
        values.phone,
        values.companyName,
        values.commercialRegisterNumber,
        values.commercialRegisterUri,
        values.commercialRegisterName,
        values.commercialRegisterMime,
      ),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authService.sendPasswordResetEmail(email),
  });
}

export function useResendConfirmation() {
  return useMutation({
    mutationFn: (email: string) => authService.resendConfirmationEmail(email),
  });
}

export function useUpdateProfile() {
  const { profile } = useAuthStore();
  const setProfile = useAuthStore((s) => s.setProfile);

  return useMutation({
    mutationFn: (updates: Parameters<typeof authService.updateProfile>[1]) => {
      if (!profile) throw new Error('Not authenticated');
      return authService.updateProfile(profile.id, updates);
    },
    onSuccess: (updated) => setProfile(updated),
  });
}

export function useSignOut() {
  const signOut = useAuthStore((s) => s.signOut);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => signOut(),
    onSuccess: () => {
      // Clear all cached queries immediately so stale data isn't shown on next login
      qc.clear();
    },
  });
}
