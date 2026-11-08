import Link from 'next/link';
import { AboutArt } from '@/components/content/AboutArt';
import { Rise } from '@/components/content/Rise';
import { StoreBadge } from '@/components/content/StoreBadge';
import { pageMeta } from '@/content/meta';
import { AUTHOR } from '@/content/site';

export const metadata = pageMeta(
  '/about',
  'About · Raqm',
  'Why Raqm exists: a calm, private expense tracker for India that works from the bank SMS you already get.',
);

export default function AboutPage() {
  return (
    <main id="main-content">
      <section className="grid min-h-svh place-items-center px-6 pt-32 pb-16">
        <Rise className="max-w-[520px] text-center">
          <AboutArt className="mx-auto mb-8 h-[178px] w-[210px] sm:h-[221px] sm:w-[260px]" />
          <h1 className="text-[30px] leading-[1.15] font-medium tracking-tight text-ink-subtle sm:text-5xl">
            A calm money tracker <span className="text-ink">that stays on your phone.</span>
          </h1>
        </Rise>
      </section>

      <section className="mx-auto max-w-[620px] px-6 pb-section-lg">
        <Rise>
          <div className="rounded-container bg-surface p-8 shadow-ring sm:p-12">
            <p className="font-mono text-xs tracking-wide text-ink-subtle uppercase">A note from the founder</p>
            <div className="mt-6 space-y-5 text-lg leading-[1.6] text-ink-muted">
              <p>
                Your bank already tells you every time money moves. The record exists. What was missing was a way to
                read it that did not mean typing everything in, or handing your bank login to someone else.
              </p>
              <p>
                So I built Raqm to read those messages on your phone, sort them, and show you where your money went.
                Nothing needs to leave the device, and there is no account to make.
              </p>
              <p>
                Raqm is an expense tracker, and I would rather say that plainly than promise more. It shows you what
                already happened, calmly, without scolding you about it.
              </p>
              <p>It is not out yet. If that sounds useful, join the waitlist and I will tell you when it is ready.</p>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-pill bg-brand font-semibold text-brand-ink" aria-hidden="true">
                {AUTHOR.name[0]}
              </span>
              <div>
                <p className="font-medium text-ink">{AUTHOR.name}</p>
                <p className="text-sm text-ink-subtle">{AUTHOR.role}</p>
              </div>
            </div>
          </div>
        </Rise>
        <Rise className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <StoreBadge store="android" status="Android, coming soon" />
          <StoreBadge store="ios" status="iPhone, in progress" />
        </Rise>
        <p className="mt-6 text-center text-sm text-ink-subtle">
          Questions? Read the <Link href="/faq" className="text-ink underline underline-offset-4">FAQ</Link>.
        </p>
      </section>
    </main>
  );
}
