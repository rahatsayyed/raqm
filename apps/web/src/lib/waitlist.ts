import type { SupabaseClient } from '@supabase/supabase-js';
import { isValidEmail } from './validate-email';

export type WaitlistResult =
  | { status: 'success' }
  | { status: 'duplicate' }
  | { status: 'invalid' }
  | { status: 'error'; message: string };

const UNIQUE_VIOLATION = '23505';

export async function submitWaitlistEmail(
  email: string,
  source: string,
  client: SupabaseClient
): Promise<WaitlistResult> {
  if (!isValidEmail(email)) {
    return { status: 'invalid' };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const { error } = await client.from('waitlist_signups').insert({ email: normalizedEmail, source });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { status: 'duplicate' };
    }
    return { status: 'error', message: 'Something went wrong. Please try again.' };
  }

  return { status: 'success' };
}
