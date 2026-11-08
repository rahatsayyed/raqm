'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PostCover } from './PostCover';
import { Chips, SearchPill, fold } from './FilterBar';

export interface PostEntry {
  slug: string;
  title: string;
  description: string;
  tag: string;
  cover: number;
  date: string;
  minutes: number;
}

const slugTag = (t: string) => fold(t).replace(/[^a-z0-9]+/g, '-');

export function PostIndex({ entries }: { entries: PostEntry[] }) {
  const tags = useMemo(() => Array.from(new Set(entries.map((e) => e.tag))), [entries]);
  const [tag, setTag] = useState('all');
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const [fading, setFading] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    const read = () => {
      const h = decodeURIComponent(location.hash.replace(/^#tag=/, ''));
      const match = tags.find((t) => slugTag(t) === h);
      setTag(match ? slugTag(match) : 'all');
    };
    read();
    addEventListener('hashchange', read);
    return () => removeEventListener('hashchange', read);
  }, [tags]);

  useEffect(() => {
    const t = setTimeout(() => setQ(input), 160);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setFading(true);
    const t = setTimeout(() => setFading(false), 180);
    return () => clearTimeout(t);
  }, [tag, q]);

  const pick = (id: string) => {
    setTag(id);
    history.replaceState(null, '', id === 'all' ? location.pathname : `#tag=${id}`);
  };

  const needle = fold(q);
  const shown = entries.filter(
    (e) =>
      (tag === 'all' || slugTag(e.tag) === tag) &&
      (!needle || fold(`${e.title} ${e.description} ${e.tag}`).includes(needle)),
  );
  const flat = tag !== 'all' || needle.length > 0;

  const chipItems = [{ id: 'all', label: 'All' }, ...tags.map((t) => ({ id: slugTag(t), label: t }))];

  return (
    <div className="mx-auto max-w-wide px-6 pb-section-lg">
      <div className="relative mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex min-w-0 flex-1">
          <Chips items={chipItems} active={tag} onPick={pick} label="Filter posts by topic" />
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-16 bg-linear-to-l from-canvas to-transparent sm:block" />
        </div>
        <SearchPill value={input} onChange={setInput} label="Search posts" />
      </div>

      <div
        className={`transition-[opacity,transform] duration-[180ms] ease-standard ${fading ? 'translate-y-2 opacity-0' : ''}`}
      >
        {shown.length === 0 ? (
          <p className="rounded-container bg-surface p-12 text-center text-ink-muted shadow-ring">
            No posts match that. Try another word or clear the filter.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((p, i) => (
              <PostCard key={p.slug} p={p} featured={!flat && i === 0} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PostCard({ p, featured }: { p: PostEntry; featured: boolean }) {
  return (
    <li className={featured ? 'sm:col-span-2' : ''}>
      <Link
        href={`/blog/${p.slug}`}
        className="group flex h-full flex-col rounded-container bg-surface p-2 shadow-ring transition-shadow duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [@media(hover:hover)]:hover:shadow-3"
      >
        <div className="relative overflow-hidden rounded-cell">
          <PostCover
            variant={p.cover}
            className={`transition-transform duration-[600ms] ease-out [@media(hover:hover)]:group-hover:scale-[1.04] motion-reduce:transition-none ${featured ? 'aspect-[16/10]' : 'aspect-[340/222]'}`}
          />
          <span className="absolute top-3 left-3 rounded-pill bg-surface px-3 py-1 text-xs font-medium text-ink shadow-1">
            {p.tag}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-2 px-4 pt-4 pb-4">
          <p className="font-mono text-xs text-ink-subtle">
            {p.date} · {p.minutes} min read
          </p>
          <h2 className={`font-medium text-ink text-balance ${featured ? 'text-2xl sm:text-[28px] sm:leading-9' : 'text-h3'}`}>
            {p.title}
          </h2>
          {featured && <p className="max-w-xl text-ink-muted">{p.description}</p>}
        </div>
      </Link>
    </li>
  );
}
