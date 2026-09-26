import { WaitlistForm } from './WaitlistForm';

export function WaitlistSection() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 text-left">
      <div className="glass-card p-8 sm:p-12">
        <h2 className="mb-3 text-balance font-display text-2xl text-ink-headline sm:text-3xl">Get early access</h2>
        <p className="mb-6 font-body text-base text-ink-body">
          We’ll email you the moment Raqm is ready to install. Nothing else, no spam.
        </p>
        <WaitlistForm source="home_waitlist_section" />
      </div>
    </section>
  );
}
