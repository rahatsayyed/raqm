import { ALTERNATIVES, getAlternative } from '@/content/alternatives';
import { OG_CONTENT_TYPE, OG_SIZE } from '@/lib/seo/constants';
import { renderOg } from '@/lib/seo/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return ALTERNATIVES.map((a) => ({ slug: a.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const alt = getAlternative(slug);
  return renderOg({ eyebrow: 'Compare', title: alt ? `Raqm vs ${alt.name}` : 'Compare Raqm' });
}
