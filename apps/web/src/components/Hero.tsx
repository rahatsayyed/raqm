import { WaitlistForm } from './WaitlistForm';

export function Hero() {
  return (
    <section className="relative mx-auto max-w-5xl overflow-hidden px-6 py-28 sm:py-36">
      <div
        aria-hidden="true"
        className="glass-card pointer-events-none absolute -right-10 -top-6 h-36 w-56 rotate-6 opacity-30"
      />
      <div className="glass-card relative mx-auto flex max-w-2xl flex-col items-center gap-6 p-10 text-center sm:p-14">
        <h1 className="font-display text-4xl leading-tight text-ink-headline sm:text-5xl">
          Know where your money goes. Automatically.
        </h1>
        <p className="max-w-xl font-body text-lg text-ink-body">
          Raqm reads your bank SMS on your phone and turns it into a clear picture of your spending —
          no bank linking, no manual entry, nothing sent to a server.
        </p>
        <WaitlistForm source="home_hero" />
        <p className="font-body text-sm text-ink-label">Your SMS never leaves your phone.</p>
        <p className="font-mono text-sm text-ink-label">
          <span className="text-lg font-semibold text-accent-primary">120+</span> Indian and international
          banks supported
        </p>
      </div>
    </section>
  );
}
