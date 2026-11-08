import type { MetadataRoute } from 'next';
import { FAQ_UPDATED } from '@/content/faq';
import { POSTS } from '@/content/posts';
import { absoluteUrl } from '@/content/site';
import { featureDeepDives } from '@/lib/features-data';

const BUILD_DATE = new Date().toISOString().slice(0, 10);

export default function sitemap(): MetadataRoute.Sitemap {
  const latestPost = POSTS.map((p) => p.updatedAt).sort().at(-1) ?? BUILD_DATE;
  return [
    { url: absoluteUrl('/'), lastModified: BUILD_DATE, priority: 1 },
    { url: absoluteUrl('/features'), lastModified: BUILD_DATE, priority: 0.9 },
    ...featureDeepDives.map((f) => ({ url: absoluteUrl(`/features/${f.slug}`), lastModified: BUILD_DATE, priority: 0.7 })),
    { url: absoluteUrl('/free'), lastModified: BUILD_DATE, priority: 0.7 },
    { url: absoluteUrl('/blog'), lastModified: latestPost, priority: 0.8 },
    ...POSTS.map((p) => ({ url: absoluteUrl(`/blog/${p.slug}`), lastModified: p.updatedAt, priority: 0.7 })),
    { url: absoluteUrl('/faq'), lastModified: FAQ_UPDATED, priority: 0.7 },
    { url: absoluteUrl('/about'), lastModified: BUILD_DATE, priority: 0.5 },
    { url: absoluteUrl('/download'), lastModified: BUILD_DATE, priority: 0.6 },
    { url: absoluteUrl('/privacy'), lastModified: BUILD_DATE, priority: 0.3 },
  ];
}
