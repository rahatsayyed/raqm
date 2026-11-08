import type { MetadataRoute } from 'next';
import { POSTS } from '@/content/posts';
import { absoluteUrl } from '@/content/site';
import { featureDeepDives } from '@/lib/features-data';

export default function sitemap(): MetadataRoute.Sitemap {
  const latest = POSTS.map((p) => p.updatedAt).sort().at(-1) ?? '2026-11-08';
  const pages = ['/features', '/blog', '/faq', '/free', '/about', '/privacy', '/download'].map((p) => ({
    url: absoluteUrl(p),
    lastModified: latest,
  }));
  return [
    { url: absoluteUrl('/'), lastModified: latest },
    ...pages,
    ...featureDeepDives.map((f) => ({ url: absoluteUrl(`/features/${f.slug}`), lastModified: latest })),
    ...POSTS.map((p) => ({ url: absoluteUrl(`/blog/${p.slug}`), lastModified: p.updatedAt })),
  ];
}
