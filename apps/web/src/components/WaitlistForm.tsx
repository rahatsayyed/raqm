'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { waitlistSignupAction } from '@/app/actions/waitlist';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-cta bg-accent-primary px-6 py-4 font-body text-sm font-medium text-[var(--color-surface)] disabled:opacity-60"
    >
      {pending ? 'Joining…' : 'Get early access'}
    </button>
  );
}

export function WaitlistForm({ source }: { source: string }) {
  const [state, formAction] = useActionState(waitlistSignupAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute h-0 w-0 overflow-hidden opacity-0"
      />
      <input type="hidden" name="source" value={source} />
      <label htmlFor={`email-${source}`} className="sr-only">
        Email address
      </label>
      <input
        id={`email-${source}`}
        type="email"
        name="email"
        required
        placeholder="you@email.com"
        className="rounded-inner border border-[var(--color-border-subtle)] bg-surface px-4 py-4 font-body text-sm text-ink-headline placeholder:text-ink-label focus:outline-2 focus:outline-accent-primary"
      />
      <SubmitButton />
      <div aria-live="polite" className="w-full text-sm">
        {state?.status === 'success' && (
          <p className="text-accent-primary">You&apos;re on the list — we&apos;ll email you at launch.</p>
        )}
        {state?.status === 'duplicate' && <p className="text-ink-label">You&apos;re already on the list.</p>}
        {state?.status === 'invalid' && (
          <p className="text-error-muted">That doesn&apos;t look like a valid email.</p>
        )}
        {state?.status === 'error' && <p className="text-error-muted">{state.message}</p>}
      </div>
    </form>
  );
}
