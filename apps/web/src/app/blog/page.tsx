import { PageHeader } from '@/components/content/PageHeader';
import { PostIndex } from '@/components/content/PostIndex';
import { JsonLd } from '@/components/content/JsonLd';
import { pageMeta } from '@/content/meta';
import { formatDate, readMinutes, sortedPosts } from '@/content/posts';
import { absoluteUrl } from '@/content/site';

export const metadata = pageMeta(
  '/blog',
  'Blog · Raqm',
  'Notes from the team building Raqm: on-device privacy, tracking spending from bank SMS in India, and how the app thinks.',
);

export default function BlogPage() {
  const entries = sortedPosts().map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    tag: p.tag,
    cover: p.cover,
    date: formatDate(p.publishedAt),
    minutes: readMinutes(p),
  }));

  return (
    <main id="main-content">
      <JsonLd
        data={[
          { '@context': 'https://schema.org', '@type': 'Blog', name: 'Raqm blog', url: absoluteUrl('/blog') },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
              { '@type': 'ListItem', position: 2, name: 'Blog', item: absoluteUrl('/blog') },
            ],
          },
        ]}
      />
      <PageHeader
        eyebrow="Blog"
        title="Notes on money and privacy"
        sub="What we are building, why it works the way it does, and how to get a clear view of your spending."
      />
      <PostIndex entries={entries} />
    </main>
  );
}
