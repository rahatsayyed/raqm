import { describe, expect, it } from 'vitest';
import { waitlistSignupAction } from './waitlist';

function formDataWith(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

describe('waitlistSignupAction', () => {
  it('short-circuits to success when the honeypot field is filled, without touching Supabase', async () => {
    const formData = formDataWith({ email: 'person@example.com', source: 'home_hero', company: 'a bot filled this' });
    const result = await waitlistSignupAction(null, formData);
    expect(result).toEqual({ status: 'success' });
  });

  it('returns a graceful error instead of throwing when the Supabase client cannot be constructed', async () => {
    const formData = formDataWith({ email: 'person@example.com', source: 'home_hero', company: '' });
    const result = await waitlistSignupAction(null, formData);
    expect(result).toEqual({ status: 'error', message: 'Something went wrong. Please try again.' });
  });
});
