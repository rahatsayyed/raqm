'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { lenisInstance, scrollToHash } from './SmoothScrollProvider';
import { buttonClasses } from './ui/Button';
import { cx } from './ui/cx';

const LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Features', href: '/#features' },
  { label: 'Tools', href: '/tools' },
  { label: 'Free', href: '/free' },
  { label: 'Blog', href: '/blog' },
  { label: 'FAQ', href: '/faq' },
] as const;

const CTA = { label: 'Join waitlist', href: '/#waitlist' };

function isActive(href: string, pathname: string) {
  if (href === '/') return pathname === '/';
  if (href === '/#features') return pathname.startsWith('/features');
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Wordmark() {
  return (
    <span className="flex items-center gap-2 font-sans text-[17px] font-semibold tracking-[-0.02em] text-ink">
      <span aria-hidden="true" className="grid size-6 place-items-center rounded-tag bg-brand font-mono text-[13px] leading-none text-brand-ink">
        R
      </span>
      Raqm
    </span>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const upDist = useRef(0);
  const rootRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const hoverIndex = useRef<number | null>(null);
  const placed = useRef(false);

  const activeIndex = LINKS.findIndex((link) => isActive(link.href, pathname));

  const moveBar = useCallback(
    (index: number, immediate = false) => {
      const bar = barRef.current;
      const list = listRef.current;
      const link = linkRefs.current[index];
      if (!bar || !list) return;
      if (!link) {
        gsap.to(bar, { opacity: 0, duration: immediate ? 0 : 0.15 });
        return;
      }
      const listBox = list.getBoundingClientRect();
      const box = link.getBoundingClientRect();
      const x = box.left - listBox.left + box.width / 2 - bar.offsetWidth / 2;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const snap = immediate || reduce || !placed.current;
      gsap.to(bar, { x, opacity: 1, duration: snap ? 0 : 0.35, ease: 'power3.out', overwrite: true });
      placed.current = true;
    },
    [],
  );

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        { motion: '(prefers-reduced-motion: no-preference)', reduce: '(prefers-reduced-motion: reduce)' },
        (ctx) => {
          if (ctx.conditions?.motion) {
            gsap.from(rootRef.current, { y: -24, opacity: 0, duration: 0.8, ease: 'power3.out', delay: 0.1, clearProps: 'transform,opacity' });
          }
        },
      );
    },
    { scope: rootRef },
  );

  useLayoutEffect(() => {
    moveBar(activeIndex);
    const onResize = () => moveBar(hoverIndex.current ?? activeIndex, true);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activeIndex, moveBar]);

  useEffect(() => {
    document.fonts?.ready.then(() => moveBar(hoverIndex.current ?? activeIndex, true));
  }, [activeIndex, moveBar]);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY.current;
      lastY.current = y;
      if (y < 80) {
        upDist.current = 0;
        setHidden(false);
      } else if (dy > 0) {
        upDist.current = 0;
        setHidden(true);
      } else if (dy < 0) {
        upDist.current -= dy;
        if (upDist.current > 48) setHidden(false);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    const onDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  useGSAP(
    () => {
      if (!open || !sheetRef.current) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(sheetRef.current, { y: -12, opacity: 0, scale: 0.98, duration: 0.35, ease: 'power3.out', transformOrigin: 'top center' });
        gsap.from('[data-sheet-item]', { y: 10, opacity: 0, duration: 0.4, ease: 'power3.out', stagger: 0.04, delay: 0.05 });
      });
    },
    { dependencies: [open], scope: rootRef },
  );

  const onNavigate = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setOpen(false);
    if (pathname !== '/' || event.metaKey || event.ctrlKey || event.shiftKey) return;
    if (href === '/') {
      event.preventDefault();
      history.pushState(null, '', '/');
      if (lenisInstance) lenisInstance.scrollTo(0, { duration: 2.2 });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (href.startsWith('/#')) {
      event.preventDefault();
      scrollToHash(href.slice(1));
    }
  };

  const hover = (index: number | null) => {
    hoverIndex.current = index;
    moveBar(index ?? activeIndex);
  };

  return (
    <header
      ref={rootRef}
      onFocusCapture={() => setHidden(false)}
      className="fixed inset-x-0 top-4 z-40 px-4 md:top-6"
    >
      <div
        className={cx(
          'relative mx-auto max-w-col transition-[transform,opacity] duration-250 ease-out motion-reduce:transition-none',
          hidden && !open && '-translate-y-[calc(100%+2rem)] opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100',
        )}
      >
        <nav
          aria-label="Primary"
          className="flex h-[54px] items-center justify-between rounded-pill bg-surface/85 pl-4 pr-2 shadow-ring backdrop-blur-xl [box-shadow:var(--shadow-ring),var(--shadow-1)] md:pl-5"
        >
          <Link
            href="/"
            aria-label="Raqm home"
            onClick={(event) => onNavigate(event, '/')}
            className="rounded-pill focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <Wordmark />
          </Link>

          <ul ref={listRef} onMouseLeave={() => hover(null)} className="relative hidden items-center md:flex">
            {LINKS.map((link, index) => (
              <li key={link.label}>
                <Link
                  ref={(node) => {
                    linkRefs.current[index] = node;
                  }}
                  href={link.href}
                  aria-current={index === activeIndex ? 'page' : undefined}
                  onClick={(event) => onNavigate(event, link.href)}
                  onMouseEnter={() => hover(index)}
                  onFocus={() => hover(index)}
                  onBlur={() => hover(null)}
                  className={cx(
                    'block rounded-pill px-3.5 py-2 font-sans text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring lg:px-4',
                    index === activeIndex ? 'text-ink' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <span ref={barRef} aria-hidden="true" className="pointer-events-none absolute -bottom-px left-0 h-0.5 w-7 rounded-pill bg-ink opacity-0" />
          </ul>

          <div className="flex items-center gap-1">
            <Link
              href={CTA.href}
              onClick={(event) => onNavigate(event, CTA.href)}
              className={buttonClasses('primary', 'sm', 'hidden sm:inline-flex')}
            >
              {CTA.label}
            </Link>
            <button
              type="button"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((value) => !value)}
              className="grid size-[38px] place-items-center rounded-pill text-ink transition-colors duration-150 hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring md:hidden"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                {open ? <path d="M4 4l10 10M14 4L4 14" /> : <path d="M3 6h12M3 12h12" />}
              </svg>
            </button>
          </div>
        </nav>

        {open && (
          <div
            ref={sheetRef}
            id="mobile-menu"
            className="absolute inset-x-0 top-full mt-2 rounded-container bg-surface p-2 shadow-ring backdrop-blur-xl [box-shadow:var(--shadow-ring),var(--shadow-3)] md:hidden"
          >
            <ul className="flex flex-col">
              {LINKS.map((link, index) => (
                <li key={link.label} data-sheet-item>
                  <Link
                    href={link.href}
                    aria-current={index === activeIndex ? 'page' : undefined}
                    onClick={(event) => onNavigate(event, link.href)}
                    className={cx(
                      'flex h-12 items-center justify-between rounded-cell px-4 font-sans text-lg font-medium tracking-[-0.01em] transition-colors duration-150 hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring',
                      index === activeIndex ? 'text-ink' : 'text-ink-muted',
                    )}
                  >
                    {link.label}
                    {index === activeIndex && <span aria-hidden="true" className="size-1.5 rounded-pill bg-brand" />}
                  </Link>
                </li>
              ))}
            </ul>
            <div data-sheet-item className="p-2 pt-3">
              <Link href={CTA.href} onClick={(event) => onNavigate(event, CTA.href)} className={buttonClasses('primary', 'md', 'w-full')}>
                {CTA.label}
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
