import { describe, expect, it, vi } from 'vitest';
import { submitWaitlistEmail } from './waitlist';
import type { SupabaseClient } from '@supabase/supabase-js';

function makeFakeClient(insertResult: { error: { code: string } | null }) {
  const insert = vi.fn().mockResolvedValue(insertResult);
  const from = vi.fn().mockReturnValue({ insert });
  return {
    client: { from } as unknown as SupabaseClient,
    insert,
    from,
  };
}

describe('submitWaitlistEmail', () => {
  it('returns invalid for an empty email without touching the client', async () => {
    const { client, from } = makeFakeClient({ error: null });
    const result = await submitWaitlistEmail('', 'home_hero', client);
    expect(result).toEqual({ status: 'invalid' });
    expect(from).not.toHaveBeenCalled();
  });

  it('returns invalid for whitespace-only email', async () => {
    const { client, from } = makeFakeClient({ error: null });
    const result = await submitWaitlistEmail('   ', 'home_hero', client);
    expect(result).toEqual({ status: 'invalid' });
    expect(from).not.toHaveBeenCalled();
  });

  it('inserts a normalized (trimmed, lowercased) email on success', async () => {
    const { client, insert } = makeFakeClient({ error: null });
    const result = await submitWaitlistEmail('  Person@Example.com  ', 'home_hero', client);
    expect(result).toEqual({ status: 'success' });
    expect(insert).toHaveBeenCalledWith({ email: 'person@example.com', source: 'home_hero' });
  });

  it('returns duplicate when the unique constraint fires', async () => {
    const { client } = makeFakeClient({ error: { code: '23505' } });
    const result = await submitWaitlistEmail('person@example.com', 'home_hero', client);
    expect(result).toEqual({ status: 'duplicate' });
  });

  it('returns a friendly error for any other database error', async () => {
    const { client } = makeFakeClient({ error: { code: '500' } });
    const result = await submitWaitlistEmail('person@example.com', 'home_hero', client);
    expect(result).toEqual({ status: 'error', message: 'Something went wrong. Please try again.' });
  });
});
