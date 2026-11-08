import type { Post } from '@/content/posts';
import { AUTHOR, SITE_NAME, SITE_URL, absoluteUrl } from '@/content/site';
import { ogImagePath } from './meta';
import { seoFor } from './pages';

export type JsonLdNode = { '@type': string; '@id'?: string } & Record<string, unknown>;

export const ids = {
  org: `${SITE_URL}/#organization`,
  site: `${SITE_URL}/#website`,
  app: `${SITE_URL}/#app`,
  author: `${SITE_URL}/about#author`,
} as const;

export const LOGO_PATH = '/icon-512.png';

export function graph(...nodes: JsonLdNode[]) {
  return { '@context': 'https://schema.org', '@graph': nodes };
}

export function organizationNode(): JsonLdNode {
  return {
    '@type': 'Organization',
    '@id': ids.org,
    name: SITE_NAME,
    url: absoluteUrl('/'),
    description: 'Raqm is an on-device personal expense tracker for India that reads bank SMS on your phone.',
    logo: { '@type': 'ImageObject', url: absoluteUrl(LOGO_PATH), width: 512, height: 512 },
    founder: { '@id': ids.author },
  };
}

export function websiteNode(): JsonLdNode {
  return {
    '@type': 'WebSite',
    '@id': ids.site,
    url: absoluteUrl('/'),
    name: SITE_NAME,
    inLanguage: 'en-IN',
    publisher: { '@id': ids.org },
  };
}

export function personNode(): JsonLdNode {
  return {
    '@type': 'Person',
    '@id': ids.author,
    name: AUTHOR.name,
    jobTitle: 'Founder',
    description: AUTHOR.bio,
    url: absoluteUrl('/about'),
    worksFor: { '@id': ids.org },
  };
}

// Entity only: pre-launch, so no offers, rating, review, sameAs or download URL.
export function mobileAppNode(): JsonLdNode {
  return {
    '@type': 'MobileApplication',
    '@id': ids.app,
    name: SITE_NAME,
    url: absoluteUrl('/'),
    description:
      'On-device expense tracker for India. On Android it reads bank SMS on the phone and builds categorised transactions. Not yet published; join the waitlist.',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Android',
    publisher: { '@id': ids.org },
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbNode(pagePath: string, crumbs: Crumb[]): JsonLdNode {
  const all: Crumb[] = [{ name: 'Home', path: '/' }, ...crumbs];
  return {
    '@type': 'BreadcrumbList',
    '@id': `${absoluteUrl(pagePath)}#breadcrumb`,
    itemListElement: all.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

type PageType = 'WebPage' | 'AboutPage' | 'CollectionPage';

export function webPageNode(
  type: PageType,
  path: string,
  name: string,
  description: string,
  extra: Record<string, unknown> = {},
  withBreadcrumb = true,
): JsonLdNode {
  const url = absoluteUrl(path);
  return {
    '@type': type,
    '@id': `${url}#webpage`,
    url,
    name,
    description,
    inLanguage: 'en-IN',
    isPartOf: { '@id': ids.site },
    primaryImageOfPage: { '@type': 'ImageObject', url: absoluteUrl(ogImagePath(path)) },
    ...(withBreadcrumb ? { breadcrumb: { '@id': `${url}#breadcrumb` } } : {}),
    ...extra,
  };
}

export function blogPostingNode(post: Post): JsonLdNode {
  const url = absoluteUrl(`/blog/${post.slug}`);
  return {
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: post.title,
    description: seoFor(`/blog/${post.slug}`)?.description ?? post.description,
    abstract: post.quickAnswer,
    articleSection: post.tag,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { '@id': ids.author },
    publisher: { '@id': ids.org },
    mainEntityOfPage: { '@id': `${url}#webpage` },
    isPartOf: { '@id': `${absoluteUrl('/blog')}#webpage` },
    inLanguage: 'en-IN',
    isAccessibleForFree: true,
    image: [absoluteUrl(ogImagePath(`/blog/${post.slug}`))],
  };
}

export function itemListNode(path: string, items: { name: string; path: string }[]): JsonLdNode {
  return {
    '@type': 'ItemList',
    '@id': `${absoluteUrl(path)}#list`,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      url: absoluteUrl(it.path),
    })),
  };
}

// Org, site and founder nodes ride on every page so @id references always resolve.
export function siteNodes(): JsonLdNode[] {
  return [organizationNode(), websiteNode(), personNode()];
}
