import type { Metadata } from 'next';
import { SITE_NAME, absoluteUrl } from '@/content/site';
import { OG_DEFAULT_ALT, OG_SIZE } from './constants';
import { seoFor } from './pages';

export function ogImagePath(path: string) {
  return /^\/(blog|features|alternatives)\/[^/]+$/.test(path) ? `${path}/opengraph-image` : '/opengraph-image';
}

interface Article {
  publishedTime: string;
  modifiedTime: string;
  authors: string[];
  tags: string[];
}

// Child openGraph replaces the parent's, so every page gets its images and twitter here.
export function pageMeta(path: string, fallbackTitle?: string, fallbackDescription?: string, article?: Article): Metadata {
  const seo = seoFor(path);
  const title = seo?.title ?? fallbackTitle ?? SITE_NAME;
  const description = seo?.description ?? fallbackDescription ?? '';
  const url = absoluteUrl(path);
  const images = [{ url: absoluteUrl(ogImagePath(path)), ...OG_SIZE, alt: seo?.title ?? OG_DEFAULT_ALT }];
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      siteName: SITE_NAME,
      title,
      description,
      url,
      locale: 'en_IN',
      images,
      ...(article ? { type: 'article' as const, ...article } : { type: 'website' as const }),
    },
    twitter: { card: 'summary_large_image', title, description, images: images.map((i) => i.url) },
  };
}
