import { PageHeader } from '@/components/content/PageHeader';
import { PostIndex } from '@/components/content/PostIndex';
import { JsonLd } from '@/components/content/JsonLd';
import { pageMeta } from '@/content/meta';
import { formatDate, readMinutes, sortedPosts } from '@/content/posts';
import { absoluteUrl } from '@/content/site';
import { PAGE_SEO } from '@/lib/seo/pages';
import { breadcrumbNode, graph, itemListNode, siteNodes, webPageNode } from '@/lib/seo/schema';

export const metadata = pageMeta('/blog');

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
        data={graph(
          ...siteNodes(),
          webPageNode('CollectionPage', '/blog', PAGE_SEO['/blog'].title, PAGE_SEO['/blog'].description, {
            mainEntity: { '@id': `${absoluteUrl('/blog')}#list` },
          }),
          itemListNode('/blog', entries.map((e) => ({ name: e.title, path: `/blog/${e.slug}` }))),
          breadcrumbNode('/blog', [{ name: 'Blog', path: '/blog' }]),
        )}
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
