import { ScrollReveal } from './ScrollReveal';
import { HowItWorksPhone } from './HowItWorksPhone';

export function HowItWorks() {
  return (
    <div id="how-it-works" className="relative">
      <ScrollReveal className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
        <span className="mb-3 block font-mono text-xs text-ink-label opacity-60">01 / 05</span>
        <h2 className="mb-4 text-balance font-display text-4xl text-ink-headline sm:text-5xl">How it works</h2>
        <p className="max-w-xl font-body text-base text-ink-body sm:text-lg">
          One SMS, quietly upgraded — follow a single spend from notification to dashboard.
        </p>
      </ScrollReveal>
      <HowItWorksPhone />
    </div>
  );
}
