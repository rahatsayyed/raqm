'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { waitlistSignupAction } from '@/app/actions/waitlist';

type Tone = 'light' | 'dark';

function SubmitButton({ tone }: { tone: Tone }) {
  const { pending } = useFormStatus();
  const dark = tone === 'dark';

  return (
    <button
      type="submit"
      disabled={pending}
      className={`h-12 shrink-0 whitespace-nowrap rounded-pill px-6 text-sm font-semibold transition-[opacity,transform] duration-150 [transition-timing-function:var(--ease-standard)] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 motion-reduce:transition-none sm:h-14 sm:px-8 sm:text-base ${
        dark ? 'bg-inverse text-inverse-ink focus-visible:outline-inverse' : 'bg-brand text-brand-ink focus-visible:outline-ring'
      }`}
    >
      {pending ? 'Joining…' : 'Get early access'}
    </button>
  );
}

function StatusIcon({ kind }: { kind: 'ok' | 'info' | 'warn' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="mt-0.5 size-4 shrink-0">
      {kind === 'ok' ? (
        <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      ) : kind === 'info' ? (
        <path d="M3.5 8h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path d="M8 3.5v5M8 12v.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function WaitlistForm({ source, tone = 'light' }: { source: string; tone?: Tone }) {
  const dark = tone === 'dark';
  const [state, formAction] = useActionState(waitlistSignupAction, null);
  const [email, setEmail] = useState('');
  const [lastState, setLastState] = useState(state);

  if (state !== lastState) {
    setLastState(state);
    if (state?.status === 'success') {
      setEmail('');
    }
  }

  const msgTone = dark ? 'text-brand-ink' : 'text-ink';
  const errTone = dark ? 'text-brand-ink' : 'text-negative';
  const invalid = state?.status === 'invalid' || state?.status === 'error';

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute h-0 w-0 overflow-hidden opacity-0" />
      <input type="hidden" name="source" value={source} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
          aria-invalid={invalid}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={`h-12 w-full min-w-0 rounded-pill sm:flex-1 bg-surface px-6 text-base text-ink shadow-ring outline-none transition-shadow duration-150 placeholder:text-ink-subtle focus-visible:outline-2 focus-visible:outline-offset-2 sm:h-14 ${
            dark ? 'focus-visible:outline-inverse' : 'focus-visible:outline-ring'
          }`}
        />
        <SubmitButton tone={tone} />
      </div>
      <div aria-live="polite" className="min-h-5 px-2 text-sm">
        {state?.status === 'success' && (
          <p className={`flex gap-2 font-medium ${msgTone}`}>
            <StatusIcon kind="ok" />
            You’re on the list. We’ll email you at launch.
          </p>
        )}
        {state?.status === 'duplicate' && (
          <p className={`flex gap-2 ${msgTone}`}>
            <StatusIcon kind="info" />
            You’re already on the list.
          </p>
        )}
        {state?.status === 'invalid' && (
          <p className={`flex gap-2 ${errTone}`}>
            <StatusIcon kind="warn" />
            That doesn’t look like a valid email.
          </p>
        )}
        {state?.status === 'error' && (
          <p className={`flex gap-2 ${errTone}`}>
            <StatusIcon kind="warn" />
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
