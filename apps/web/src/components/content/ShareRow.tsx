'use client';

import { useState } from 'react';

export function ShareRow({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    { label: 'Share on WhatsApp', href: `https://wa.me/?text=${t}%20${u}`, d: 'M4 20l1.3-4.2A8 8 0 1 1 8.4 18.8L4 20zm5-11c0 3 3 6 6 6l1.2-1.6-2-1-.8.8c-1-.4-2-1.4-2.4-2.4l.8-.8-1-2L9 9z' },
    { label: 'Share on X', href: `https://twitter.com/intent/tweet?text=${t}&url=${u}`, d: 'M5 5l14 14M19 5L5 19' },
    { label: 'Share on LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, d: 'M6 10v8M6 6.5v.01M11 18v-8m0 3c0-2 1.5-3 3-3s3 1 3 3v5' },
  ];
  const btn =
    'grid size-9 place-items-center rounded-pill bg-surface text-ink-muted shadow-ring transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [@media(hover:hover)]:hover:text-ink';
  return (
    <div className="flex items-center gap-2 border-t border-line pt-5">
      <span className="mr-2 text-sm font-medium text-ink-subtle">Share</span>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" aria-label={l.label} className={btn}>
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={l.d} />
          </svg>
        </a>
      ))}
      <span className="relative">
        <button
          type="button"
          aria-label={copied ? 'Link copied' : 'Copy link'}
          className={btn}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              window.prompt('Copy this link', url);
            }
          }}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
          </svg>
        </button>
        {copied && (
          <span role="status" className="absolute -top-9 left-1/2 -translate-x-1/2 rounded-tag bg-inverse px-2 py-1 text-xs whitespace-nowrap text-inverse-ink">
            Link copied!
          </span>
        )}
      </span>
    </div>
  );
}
