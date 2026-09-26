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
      className="shrink-0 whitespace-nowrap rounded-cta bg-accent-primary px-6 py-4 font-body text-sm font-medium text-[var(--color-surface)] transition-[background-color,transform] duration-150 hover:bg-accent-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
    >
      {pending ? 'Joining…' : 'Get early access'}
    </button>
  );
}

export function WaitlistForm({ source }: { source: string }) {
  const [state, formAction] = useActionState(waitlistSignupAction, null);

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute h-0 w-0 overflow-hidden opacity-0"
      />
      <input type="hidden" name="source" value={source} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <label htmlFor={`email-${source}`} className="sr-only">
          Email address
        </label>
        <input
          id={`email-${source}`}
          type="email"
          name="email"
          required
          autoComplete="email"
          spellCheck={false}
          placeholder="you@email.com"
          className="min-w-0 flex-1 rounded-inner border border-[var(--color-border-subtle)] bg-surface px-4 py-4 font-body text-sm text-ink-headline placeholder:text-ink-body focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-primary"
        />
        <SubmitButton />
      </div>
      <div aria-live="polite" className="w-full text-sm">
        {state?.status === 'success' && (
          <p className="text-accent-primary">You’re on the list. We’ll email you at launch.</p>
        )}
        {state?.status === 'duplicate' && <p className="text-ink-label">You’re already on the list.</p>}
        {state?.status === 'invalid' && (
          <p className="text-error-muted">That doesn’t look like a valid email.</p>
        )}
        {state?.status === 'error' && <p className="text-error-muted">{state.message}</p>}
      </div>
    </form>
  );
}
