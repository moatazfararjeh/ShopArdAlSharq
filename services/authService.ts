import { supabase } from '@/lib/supabase';
import { parseSupabaseError } from '@/lib/errors';
import { Profile } from '@/types/models';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw parseSupabaseError(error);
  return data;
}

/** Returns `{ session, needsConfirmation: true }` when the server requires email verification. */
export async function signUp(email: string, password: string, fullName: string, phone: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone } },
  });
  if (error) throw parseSupabaseError(error);

  // Email confirmation is disabled → session is returned immediately.
  if (data.session) return { ...data, needsConfirmation: false };

  // No session means the server still requires email confirmation.
  // Don't attempt signInWithPassword — it will fail with email_not_confirmed.
  return { ...data, needsConfirmation: true };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw parseSupabaseError(error);
}

export async function sendPasswordResetEmail(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
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
