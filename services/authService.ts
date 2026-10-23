import { supabase } from '@/lib/supabase';
import { getClientSource } from '@/lib/clientSource';
import { parseSupabaseError } from '@/lib/errors';
import { Profile } from '@/types/models';
import { uploadDocument } from '@/services/storageService';
import { APP_URL } from '@/lib/constants';
import { logError } from '@/lib/errorLogger';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw parseSupabaseError(error);
  return { session: data.session, userId: data.user?.id ?? null };
}

/** Returns `{ session, needsConfirmation: true }` when the server requires email verification. */
export async function signUp(
  email: string,
  password: string,
  fullName: string,
  phone: string,
  companyName?: string,
  commercialRegisterNumber?: string,
  commercialRegisterUri?: string,
  commercialRegisterName?: string,
  commercialRegisterMime?: string,
) {
  const { source, appVersion } = getClientSource();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // signup_source / signup_app_version are copied onto the profile by the
    // handle_new_user trigger (migration 059) — where the account was created.
    options: { data: { full_name: fullName, phone, signup_source: source, signup_app_version: appVersion } },
  });
  if (error) throw parseSupabaseError(error);

  if (data.user) {
    const profileUpdates: Record<string, any> = {};
    if (companyName) profileUpdates.company_name = companyName;
    if (commercialRegisterNumber) profileUpdates.commercial_register_number = commercialRegisterNumber;

    // Upload commercial register document if provided
    if (commercialRegisterUri) {
      try {
        const docUrl = await uploadDocument(
          data.user.id,
          commercialRegisterUri,
          commercialRegisterName ?? 'document.jpg',
          commercialRegisterMime ?? 'image/jpeg',
        );
        profileUpdates.commercial_register_url = docUrl;
      } catch (e) {
        // Non-blocking — but still worth knowing it failed, since checkout
        // later hard-requires this document.
        logError(e, 'authService.signUp.uploadDocument', { userId: data.user.id });
      }
    }

    if (Object.keys(profileUpdates).length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('profiles') as any)
        .update(profileUpdates)
        .eq('id', data.user.id);
    }
  }

  // Email verification is now required. If Supabase returns no session it means
  // the user must click the confirmation link sent to their email first.
  if (data.session) return { ...data, needsConfirmation: false };
  return { ...data, needsConfirmation: true };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw parseSupabaseError(error);
}

export async function sendPasswordResetEmail(email: string) {
  const redirectTo = APP_URL ? `${APP_URL}/reset-password` : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    ...(redirectTo ? { redirectTo } : {}),
  });
  if (error) {
    // Keep the raw auth error in the logs — the user only sees the mapped message
    console.warn('[auth] resetPasswordForEmail failed:', error.status, (error as any).code, error.message);
    throw parseSupabaseError(error);
  }
}

export async function resendConfirmationEmail(email: string) {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw parseSupabaseError(error);
}

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw parseSupabaseError(error);
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'full_name' | 'phone' | 'avatar_url'>>,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('profiles') as any)
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw parseSupabaseError(error as { message: string; code?: string });
  return data as Profile;
}
