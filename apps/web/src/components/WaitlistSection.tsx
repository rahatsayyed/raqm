import { WaitlistForm } from './WaitlistForm';
import { ScrollReveal } from './ScrollReveal';

export function WaitlistSection() {
  return (
    <ScrollReveal className="mx-auto max-w-3xl px-6 pb-20 pt-12 text-left sm:pt-16">
      <div className="glass-card p-8 sm:p-12">
        <span className="mb-3 block font-mono text-xs text-ink-label opacity-40">04 / 04</span>
        <h2 className="mb-3 text-balance font-display text-2xl text-ink-headline sm:text-3xl">Get early access</h2>
        <p className="mb-6 font-body text-base text-ink-body">
          We’ll email you the moment Raqm is ready to install. Nothing else, no spam.
        </p>
        <WaitlistForm source="home_waitlist_section" />
      </div>
    </ScrollReveal>
  );
}
