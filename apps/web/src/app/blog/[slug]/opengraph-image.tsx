import { POSTS, getPost } from '@/content/posts';
import { AUTHOR } from '@/content/site';
import { OG_CONTENT_TYPE, OG_SIZE } from '@/lib/seo/constants';
import { renderOg } from '@/lib/seo/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  return renderOg({ eyebrow: post?.tag ?? 'Blog', title: post?.title ?? 'Raqm blog', subtitle: `By ${AUTHOR.name}` });
}
