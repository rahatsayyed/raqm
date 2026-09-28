import { AppStoreBadges } from './AppStoreBadges';
import { HeroParallax } from './HeroParallax';
import { TxTicker } from './TxTicker';

export function Hero() {
  return (
    <>
      <section id="hero" className="relative overflow-hidden px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-28">
        <HeroParallax />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
          <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface/70 px-4 py-2 font-body text-sm text-ink-body">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-label" aria-hidden="true">
              <rect x="7" y="3" width="10" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M11 18h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
             Waitlist is open
          </span>
          <h1 className="font-display text-[3.4rem] leading-[0.95] tracking-tight text-ink-headline sm:text-8xl lg:text-[8.5rem]">
            <span className="block">Every spend.</span>
            <span className="block">Zero typing.</span>
          </h1>
          <div aria-hidden="true" className="mt-9 flex gap-4 sm:mt-11 sm:gap-6">
            <span className="h-0.5 w-24 bg-black sm:w-36" />
          </div>
          <p className="mt-9 max-w-xl font-body text-lg text-ink-body sm:mt-11 sm:text-xl">
            Type it, say it, snap a statement, or just do nothing - Raqm logs it for you. Nothing ever leaves your
            phone.
          </p>
          <div className="mt-9">
            <AppStoreBadges />
          </div>
          <p className="mt-2 font-body text-sm text-ink-label">
            <span className="font-mono text-base font-semibold text-accent-primary">120+</span> Indian and international
            banks supported
          </p>
        </div>
      </section>
      <TxTicker />
    </>
  );
}
