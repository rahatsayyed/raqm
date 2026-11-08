import { WaitlistForm } from './WaitlistForm';
import { ScrollReveal } from './ScrollReveal';

export function WaitlistSection() {
  return (
    <section id="waitlist" aria-labelledby="waitlist-heading" className="px-4 pb-section pt-section sm:px-6">
      <ScrollReveal className="mx-auto max-w-wide">
        <div className="relative overflow-hidden rounded-card-lg bg-brand px-6 py-14 text-brand-ink shadow-ring sm:px-12 sm:py-20">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-pill bg-brand-ink/10 blur-3xl" />
          <div className="relative mx-auto flex max-w-xl flex-col items-center text-center">
            <p className="mb-4 font-mono text-xs uppercase tracking-widest text-brand-ink/70">Early access</p>
            <h2 id="waitlist-heading" className="mb-4 text-balance text-h2 text-brand-ink">
              Be first when Raqm is ready
            </h2>
            <p className="mb-8 max-w-md text-lead text-brand-ink/80">One email when it’s ready to install. Nothing else, no spam.</p>
            <div className="w-full">
              <WaitlistForm source="home_waitlist_section" tone="dark" />
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
