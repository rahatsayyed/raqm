import { featureDeepDives, getFeatureBySlug } from '@/lib/features-data';
import { OG_CONTENT_TYPE, OG_SIZE } from '@/lib/seo/constants';
import { renderOg } from '@/lib/seo/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return featureDeepDives.map((f) => ({ slug: f.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const feature = getFeatureBySlug(slug);
  return renderOg({
    eyebrow: feature?.status === 'coming-soon' ? 'Coming soon' : 'Feature',
    title: feature?.name ?? 'Raqm features',
    subtitle: feature?.tagline,
  });
}
