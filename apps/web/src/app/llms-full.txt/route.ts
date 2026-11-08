import { ALTERNATIVES } from '@/content/alternatives';
import { FAQ_GROUPS } from '@/content/faq';
import { POSTS, type Block } from '@/content/posts';
import { absoluteUrl } from '@/content/site';
import { featureDeepDives } from '@/lib/features-data';

export const dynamic = 'force-static';

const strip = (s: string) => s.replace(/\*\*/g, '');

function renderBlock(b: Block): string {
  switch (b.type) {
    case 'p':
      return strip(b.text);
    case 'h2':
      return `### ${b.text}`;
    case 'h3':
      return `#### ${b.text}`;
    case 'ul':
    case 'ol':
      return b.items.map((i) => `- ${strip(i)}`).join('\n');
    case 'callout':
      return `> ${b.label}: ${strip(b.text)}`;
    default:
      return '';
  }
}

export function GET() {
  const faq = FAQ_GROUPS.flatMap((g) => g.items)
    .map((f) => `### ${f.q}\n${f.a}`)
    .join('\n\n');
  const features = featureDeepDives
    .map(
      (f) =>
        `## ${f.name} (${f.status === 'live' ? 'in the app' : 'coming soon'})\n${f.tagline}\n\n${f.sections.map((s) => `- **${s.heading}**: ${s.body}`).join('\n')}`,
    )
    .join('\n\n');
  const posts = POSTS.map((p) => {
    const body = p.body.map(renderBlock).filter(Boolean).join('\n\n');
    return `## ${p.title}\nPublished ${p.publishedAt}, updated ${p.updatedAt}. ${absoluteUrl(`/blog/${p.slug}`)}\n\n${p.quickAnswer}\n\n${body}`;
  }).join('\n\n');
  const alternatives = ALTERNATIVES.map((a) => {
    const facts = a.rows.map((r) => `- ${r.feature}: Raqm: ${r.raqm} | ${a.name}: ${r.other}`).join('\n');
    return `## ${a.h1}\nVerified ${a.verifiedOn}. ${absoluteUrl(`/alternatives/${a.slug}`)}\n\n${a.lede}\n\n${facts}`;
  }).join('\n\n');
  const text = `# Raqm: full content\n\n# FAQ\n\n${faq}\n\n# Features\n\n${features}\n\n# Alternatives\n\n${alternatives}\n\n# Blog\n\n${posts}\n`;
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
