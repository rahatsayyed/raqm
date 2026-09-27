import { WaitlistForm } from './WaitlistForm';
import { HeroParallax } from './HeroParallax';
import { PhoneMockup } from './PhoneMockup';

export function Hero() {
  return (
    <section className="relative mx-auto max-w-5xl overflow-hidden px-6 py-28 sm:py-36">
      <HeroParallax />
      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" className="absolute left-8 top-8 opacity-40">
        <line x1="6" y1="0" x2="6" y2="12" stroke="var(--color-ink-label)" strokeWidth="1" />
        <line x1="0" y1="6" x2="12" y2="6" stroke="var(--color-ink-label)" strokeWidth="1" />
      </svg>
      <div className="relative flex flex-col items-center gap-14 lg:flex-row lg:items-center lg:justify-center lg:gap-10">
        <div className="glass-card relative flex w-full max-w-2xl min-w-0 flex-col items-center gap-6 p-10 text-center sm:p-14">
          <h1 className="text-balance font-display text-4xl leading-tight text-ink-headline sm:text-5xl">
            Know where your money goes. Automatically.
          </h1>
          <p className="max-w-xl font-body text-lg text-ink-body">
            Bank SMS in, spending clarity out. No linking, no typing.
          </p>
          <WaitlistForm source="home_hero" />
          <p className="font-body text-sm text-ink-label">
            Nothing you don’t choose to share ever leaves your phone.
          </p>
          <p className="font-mono text-sm text-ink-label">
            <span className="text-lg font-semibold text-accent-primary">120+</span> Indian and international
            banks supported
          </p>
        </div>
        <div className="shrink-0 scale-90 sm:scale-100">
          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}
