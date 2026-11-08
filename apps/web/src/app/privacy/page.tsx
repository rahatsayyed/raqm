import { PageHeader } from '@/components/content/PageHeader';
import { pageMeta } from '@/content/meta';

export const metadata = pageMeta(
  '/privacy',
  'Privacy · Raqm',
  'Plain-language privacy notice for the Raqm website and app: what stays on your phone and what the waitlist collects.',
);

const SECTIONS: { h: string; p: string[] }[] = [
  {
    h: 'The short version',
    p: [
      'The Raqm app processes your bank SMS on your phone and keeps your transactions in a database on your phone. We do not run a server that receives them.',
      'This website collects one thing: the email address you give the waitlist.',
    ],
  },
  {
    h: 'In the app',
    p: [
      'On Android, Raqm asks for permission to read SMS so it can turn bank alerts into transactions. The reading and parsing happen on your device.',
      'Your transactions, categories and budgets are stored locally. There is no account and no general cloud sync. Uninstalling the app removes its data from your device, so export a copy first if you want to keep it.',
      'Budget together is a separate feature that shares budget data between the people you choose. It is the one deliberate exception, and it is opt-in.',
    ],
  },
  {
    h: 'On this website',
    p: [
      'If you join the waitlist, we store your email address so we can tell you when Raqm launches. We use it for that and nothing else.',
      'We do not sell your email address. Tell us to remove it and we will.',
    ],
  },
  {
    h: 'Cookies and tracking',
    p: ['This site does not use advertising trackers. It only keeps small items in your browser that it needs to work, such as remembering that you already saw the intro animation.'],
  },
  {
    h: 'Your choices',
    p: [
      'You can ask to see or delete the email address you gave us. You can also deny SMS permission in the app and add transactions by hand.',
    ],
  },
  {
    h: 'Changes and contact',
    p: ['If this notice changes, the date at the top will change with it. Questions can go through the contact details on the website once they are published.'],
  },
];

export default function PrivacyPage() {
  return (
    <main id="main-content" className="pb-section-lg">
      <PageHeader eyebrow="Legal" title="Privacy, in plain words" sub="What Raqm does with your information, and what it does not.">
        <p className="mx-auto mt-6 inline-flex rounded-pill bg-surface-sunken px-4 py-1.5 text-[13px] text-ink-muted">
          Draft, last updated 8 Nov 2026
        </p>
      </PageHeader>
      <div className="mx-auto max-w-[720px] px-6">
        <aside className="mb-10 rounded-cell border-l-[3px] border-warning bg-surface p-5 shadow-ring">
          <p className="font-mono text-xs tracking-wide text-warning uppercase">Draft notice</p>
          <p className="mt-2 text-base text-ink">
            This policy is a draft and has not been reviewed by a lawyer. The owner needs to review and approve it
            before launch.
          </p>
        </aside>
        {SECTIONS.map((s) => (
          <section key={s.h} className="mb-10">
            <h2 className="mb-3 text-[28px] leading-8 font-semibold tracking-tight text-ink">{s.h}</h2>
            {s.p.map((t) => (
              <p key={t} className="mb-4 text-[18px] leading-[1.55] text-ink-muted">
                {t}
              </p>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
