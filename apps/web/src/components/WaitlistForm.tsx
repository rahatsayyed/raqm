'use client';

import { useActionState, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { waitlistSignupAction } from '@/app/actions/waitlist';

function SubmitButton() {
  const { pending } = useFormStatus();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const label = pending ? 'Joining…' : 'Get early access';

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    buttonRef.current?.style.setProperty('--reveal-x', `${event.clientX - rect.left}px`);
    buttonRef.current?.style.setProperty('--reveal-y', `${event.clientY - rect.top}px`);
  };

  return (
    <button
      ref={buttonRef}
      type="submit"
      disabled={pending}
      onPointerMove={handlePointerMove}
      className="group relative shrink-0 overflow-hidden whitespace-nowrap rounded-cta bg-accent-primary px-6 py-4 font-body text-sm font-medium transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
    >
      <span className="relative text-[var(--color-surface)]">{label}</span>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center bg-[var(--color-surface)] text-accent-primary opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        style={{ clipPath: 'circle(70px at var(--reveal-x, 50%) var(--reveal-y, 50%))' }}
      >
        {label}
      </span>
    </button>
  );
}

export function WaitlistForm({ source }: { source: string }) {
  const [state, formAction] = useActionState(waitlistSignupAction, null);
  const [email, setEmail] = useState('');
  const [lastState, setLastState] = useState(state);

  if (state !== lastState) {
    setLastState(state);
    if (state?.status === 'success') {
      setEmail('');
    }
  }

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
          value={email}
          onChange={(event) => setEmail(event.target.value)}
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
