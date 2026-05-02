import { supabase } from '@/lib/supabase';
import { parseSupabaseError } from '@/lib/errors';
import { Profile } from '@/types/models';
import { uploadDocument } from '@/services/storageService';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw parseSupabaseError(error);
  return data;
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
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone } },
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
      } catch {
        // Non-blocking
      }
    }

    if (Object.keys(profileUpdates).length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('profiles') as any)
        .update(profileUpdates)
        .eq('id', data.user.id);
    }
  }

  if (data.session) return { ...data, needsConfirmation: false };
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
