import { AppStoreBadges } from './AppStoreBadges';
import { HeroParallax } from './HeroParallax';
import { TxTicker } from './TxTicker';
import { HERO_PEEK_PAD } from './heroPeek';

export function Hero() {
  return (
    <section
      id="hero"
      className={`relative flex min-h-[100dvh] flex-col items-center overflow-hidden px-4 pt-32 sm:px-6 sm:pt-40 ${HERO_PEEK_PAD}`}
    >
      <HeroParallax />
      <div className="relative mx-auto flex max-w-[640px] flex-col items-center text-center">
        <span
          style={{ '--hi': 0 } as React.CSSProperties}
          className="hero-rise mb-6 inline-flex items-center gap-2 rounded-pill bg-surface px-4 py-2 text-sm text-ink-muted shadow-ring"
        >
          <span className="h-1.5 w-1.5 rounded-pill bg-brand" aria-hidden="true" />
          Waitlist is open
        </span>
        <h1 className="text-balance text-h1 text-ink">
          Every spend.
          <br />
          Zero typing.
        </h1>
        <p className="mt-6 max-w-[34rem] text-lead text-ink-muted">
          Type it, say it, snap a statement, or just do nothing. Raqm logs it for you. Your SMS and transactions never leave your phone.
        </p>
        <div style={{ '--hi': 1 } as React.CSSProperties} className="hero-rise mt-8">
          <AppStoreBadges />
        </div>
        <p style={{ '--hi': 2 } as React.CSSProperties} className="hero-rise mt-8 text-sm text-ink-subtle">
          <span className="font-mono font-medium text-ink">120+</span> Indian and international banks supported
        </p>
      </div>
      <TxTicker className="absolute inset-x-0 bottom-[calc(min(36dvh,340px)-1rem)]" />
    </section>
  );
}
