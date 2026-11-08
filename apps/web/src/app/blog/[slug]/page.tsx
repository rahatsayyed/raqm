import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/content/JsonLd';
import { PostBody } from '@/components/content/PostBody';
import { PostCover } from '@/components/content/PostCover';
import { PromoCard } from '@/components/content/PromoCard';
import { Toc } from '@/components/content/ArticleRail';
import { ShareRow } from '@/components/content/ShareRow';
import { FaqAccordion } from '@/components/sections/FaqAccordion';
import { Rise } from '@/components/content/Rise';
import { formatDate, getPost, getToc, POSTS, readMinutes, sortedPosts } from '@/content/posts';
import { AUTHOR, absoluteUrl } from '@/content/site';
import { pageMeta } from '@/lib/seo/meta';
import { blogPostingNode, breadcrumbNode, graph, siteNodes, webPageNode } from '@/lib/seo/schema';

export const dynamicParams = false;

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return pageMeta(`/blog/${post.slug}`, post.title, post.description, {
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
    authors: [AUTHOR.name],
    tags: [post.tag],
  });
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const path = `/blog/${post.slug}`;
  const url = absoluteUrl(path);
  const toc = getToc(post);
  const more = sortedPosts().filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <main id="main-content" className="pb-section-lg">
      <JsonLd
        data={graph(
          ...siteNodes(),
          webPageNode('WebPage', path, post.title, post.description, { mainEntity: { '@id': `${url}#article` } }),
          blogPostingNode(post),
          breadcrumbNode(path, [
            { name: 'Blog', path: '/blog' },
            { name: post.title, path },
          ]),
          {
            '@type': 'FAQPage',
            '@id': `${url}#faq`,
            mainEntity: post.faq.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          },
        )}
      />

      <Rise as="header" className="mx-auto max-w-col px-6 pt-36 md:pt-40">
        <nav aria-label="Breadcrumb" className="text-sm text-ink-subtle">
          <Link href="/blog" className="underline-offset-4 hover:underline">Blog</Link>
          <span className="mx-2" aria-hidden="true">/</span>
          <span className="text-ink-muted">{post.title}</span>
        </nav>
        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-ink-subtle">
          <Link
            href={`/blog#tag=${post.tag.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            rel="nofollow"
            className="rounded-pill bg-surface-sunken px-3 py-1 font-medium text-ink-muted"
          >
            {post.tag}
          </Link>
          <span className="font-mono text-xs">
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            {post.updatedAt !== post.publishedAt && (
              <>
                {' · Updated '}
                <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time>
              </>
            )}
            {` · ${readMinutes(post)} min read`}
          </span>
        </div>
        <h1 className="mt-4 max-w-3xl text-[32px] leading-[1.08] font-semibold tracking-tight text-ink text-balance md:text-[42px]">
          {post.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lead text-ink-muted">{post.description}</p>
        <div className="mt-6 max-w-2xl">
          <ShareRow url={url} title={post.title} />
        </div>
      </Rise>

      <div className="mx-auto mt-10 max-w-col px-6">
        <PostCover variant={post.cover} fit className="aspect-[2/1] rounded-container shadow-ring" />
      </div>

      <div className="mx-auto mt-12 flex max-w-col gap-10 px-6">
        <article className="min-w-0 flex-1">
          <aside className="mx-auto mb-10 max-w-[720px] rounded-cell border-l-[3px] border-brand bg-surface p-5 shadow-ring">
            <p className="font-mono text-xs tracking-wide text-ink-subtle uppercase">Quick answer</p>
            <p className="mt-2 text-base font-medium text-ink">{post.quickAnswer}</p>
          </aside>

          {toc.length > 0 && (
            <div className="mx-auto mb-10 max-w-[720px] rounded-cell bg-surface p-5 shadow-ring lg:hidden">
              <p className="mb-3 text-sm font-medium text-ink">In this post</p>
              <Toc items={toc} collapsible />
            </div>
          )}

          <PostBody blocks={post.body} />

          <section aria-labelledby="faq-h" className="mx-auto mt-16 max-w-[720px]">
            <h2 id="faq-h" className="mb-2 text-[28px] leading-8 font-semibold tracking-tight text-ink">
              Frequently asked questions
            </h2>
            <div className="rounded-container bg-surface px-6 shadow-ring">
              <FaqAccordion variant="light" categories={[{ id: 'post', label: 'Post', items: post.faq }]} />
            </div>
          </section>

          <section className="mx-auto mt-12 flex max-w-[720px] items-center gap-4 rounded-container bg-surface p-5 shadow-ring">
            <span className="grid size-12 shrink-0 place-items-center rounded-pill bg-brand font-semibold text-brand-ink" aria-hidden="true">
              {AUTHOR.name[0]}
            </span>
            <div>
              <p className="font-medium text-ink">{AUTHOR.name}</p>
              <p className="text-sm text-ink-subtle">{AUTHOR.role}</p>
              <p className="mt-1 text-sm text-ink-muted">{AUTHOR.bio}</p>
            </div>
          </section>
        </article>

        <aside className="hidden w-[226px] shrink-0 lg:block" aria-label="Table of contents">
          <div className="sticky top-[104px] flex flex-col gap-8">
            <div>
              <p className="mb-4 text-sm font-medium text-ink">In this post</p>
              <Toc items={toc} />
            </div>
            <PromoCard />
          </div>
        </aside>
      </div>

      {more.length > 0 && (
        <section className="mx-auto mt-section-lg max-w-col px-6" aria-labelledby="more-h">
          <h2 id="more-h" className="mb-5 text-h3 text-ink">Keep reading</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {more.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="group flex h-full flex-col gap-2 rounded-container bg-surface p-6 shadow-ring transition-shadow duration-200 [@media(hover:hover)]:hover:shadow-3">
                  <span className="font-mono text-xs text-ink-subtle">{p.tag}</span>
                  <span className="text-h3 text-ink">{p.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
