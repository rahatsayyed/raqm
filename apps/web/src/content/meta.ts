import type { Metadata } from 'next';
import { SITE_NAME, absoluteUrl } from './site';

export function pageMeta(path: string, title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: { type: 'website', siteName: SITE_NAME, title, description, url: absoluteUrl(path), locale: 'en_IN' },
    twitter: { card: 'summary_large_image', title, description },
  };
}
