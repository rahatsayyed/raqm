'use server';

import { submitWaitlistEmail, type WaitlistResult } from '@/lib/waitlist';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function waitlistSignupAction(
  _prevState: WaitlistResult | null,
  formData: FormData
): Promise<WaitlistResult> {
  const email = String(formData.get('email') ?? '');
  const source = String(formData.get('source') ?? 'unknown');
  const honeypot = String(formData.get('company') ?? '');

  if (honeypot.trim() !== '') {
    return { status: 'success' };
  }

  return submitWaitlistEmail(email, source, createServerSupabaseClient());
}
