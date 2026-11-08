import { ALTERNATIVES } from '@/content/alternatives';
import { FAQ_GROUPS } from '@/content/faq';
import { sortedPosts } from '@/content/posts';
import { absoluteUrl } from '@/content/site';
import { featureDeepDives } from '@/lib/features-data';
import { FEATURE_SEO } from '@/lib/seo/pages';

export const dynamic = 'force-static';

export function GET() {
  const faqCount = FAQ_GROUPS.flatMap((g) => g.items).length;
  const features = featureDeepDives
    .map((f) => `- [${f.name}](${absoluteUrl(`/features/${f.slug}`)}): ${FEATURE_SEO[f.slug]?.description ?? f.tagline}${f.status === 'coming-soon' ? ' (not built yet)' : ''}`)
    .join('\n');
  const alternatives = ALTERNATIVES.map((a) => `- [${a.h1}](${absoluteUrl(`/alternatives/${a.slug}`)}): ${a.seoDescription}`).join('\n');
  const posts = sortedPosts()
    .map((p) => `- [${p.title}](${absoluteUrl(`/blog/${p.slug}`)}): ${p.description}`)
    .join('\n');
  const text = `# Raqm

> Raqm is an on-device personal expense tracker for India. On Android it reads the bank SMS you already receive, turns them into categorised transactions, and keeps them in a database on your phone, with no account, no bank login, and no Raqm server that receives your transactions. Raqm is pre-launch: it is not on any app store yet, and the website runs an email-only waitlist.

Key facts:
- Category: expense tracker (not a financial advisor).
- Platforms: Android is the primary platform. An iPhone version is in progress and uses manual entry and PDF statement import, because iOS does not let apps read SMS.
- Capture: bank SMS parsing on the phone for 120+ bank formats, statement import, and manual and cash entry.
- Accuracy: self-transfers between your own accounts are kept out of spending, refunds are linked to the original purchase, and your edits are never undone by later scans.
- Data: stored on the device. Deleted transactions can be restored, and CSV export is available.
- Founder: Rahat Sayyed. The open-source SMS parser is published as @rahatsayyed/bank-sms-parser (AGPL-3.0): https://github.com/rahatsayyed/BankSMSParser

## Pages
- [Home](${absoluteUrl('/')}): what Raqm does and the waitlist
- [All features](${absoluteUrl('/features')}): every capability
- [How Raqm differs](${absoluteUrl('/free')}): no bank login, no account, data on your phone
- [Download status](${absoluteUrl('/download')}): not on the stores yet
- [FAQ](${absoluteUrl('/faq')}): ${faqCount} short answers on privacy, banks, budgets and data
- [About](${absoluteUrl('/about')}): founder note
- [Privacy](${absoluteUrl('/privacy')}): plain-language privacy notice

## Features
${features}

## Alternatives
- [Apps like Axio, PennyWise, Splitwise and Money Manager](${absoluteUrl('/alternatives')}): how Raqm compares, with dated and sourced facts
${alternatives}

## Blog
${posts}
`;
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
