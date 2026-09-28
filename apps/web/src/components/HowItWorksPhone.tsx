'use client';

import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SAMPLE_CATEGORIES, SAMPLE_DASHBOARD, SAMPLE_TRANSACTIONS, type SampleCategory } from '@/lib/sample-transactions';

gsap.registerPlugin(ScrollTrigger);

const tx = SAMPLE_TRANSACTIONS[0];
const tx2 = SAMPLE_TRANSACTIONS[1];
const tx3 = SAMPLE_TRANSACTIONS[2];
const d = SAMPLE_DASHBOARD;
const RING_RADIUS = 17;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const dashOffset = RING_CIRCUMFERENCE * (1 - d.usedPct / 100);
const NOTE_TEXT = 'Team lunch after standup';
const MAP_IMAGE_URL = '/images/koramangala-map.jpg';

function formatStatusTime(d: Date) {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatBodyTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatSmsDate(d: Date) {
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

function stripSign(amount: string) {
  return amount.replace(/^[+\-−]\s*/, '');
}

const STEPS = [
  { number: '01', caption: 'Payment happens', body: `${tx.source} texts you the moment you spend — nothing new to do.` },
  { number: '02', caption: 'Raqm reads it', body: 'Parsed on-device, instantly. The message never leaves your phone.' },
  { number: '03', caption: 'Upgraded, instantly', body: 'Merchant, category and budget impact — recognized before you unlock.' },
  { number: '04', caption: 'Add a note, a tag', body: 'Type it once and it stays filed with the spend.' },
  { number: '05', caption: 'Tagged with place', body: 'Raqm remembers where it happened, automatically.' },
  { number: '06', caption: 'Always in view', body: "Spend, budgets, and what's safe to spend today — one glance." },
] as const;

const STEP_COUNT = STEPS.length;
const STEP_VH = 70;

const KEY_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

function StatusBar({ time }: { time: string }) {
  return (
    <div className="relative z-10 flex items-center justify-between px-6 pt-4 font-mono text-[11px] text-ink-headline">
      <span>{time}</span>
      <span className="flex items-center gap-1.5">
        <svg viewBox="0 0 16 12" className="h-2.5 w-3.5" aria-hidden="true">
          <path d="M1 9 L1 11 L3 11 L3 6 Z M5.5 5 L5.5 11 L7.5 11 L7.5 3 Z M10 3 L10 11 L12 11 L12 1 Z" fill="currentColor" />
        </svg>
        <svg viewBox="0 0 20 12" className="h-2.5 w-4" aria-hidden="true">
          <rect x="0.5" y="0.5" width="16" height="11" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1" />
          <rect x="2" y="2" width="12" height="8" rx="1.2" fill="currentColor" />
          <rect x="17" y="4" width="2" height="4" rx="0.8" fill="currentColor" />
        </svg>
      </span>
    </div>
  );
}

function ProgressDots({ dotsRef }: { dotsRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={dotsRef} className="relative z-10 mt-3 flex gap-1.5 px-6">
      {STEPS.map((step) => (
        <span key={step.number} data-dot className="h-[3px] flex-1 rounded-full bg-border-subtle">
          <span data-dot-fill className="block h-full w-0 rounded-full bg-accent-primary" />
        </span>
      ))}
    </div>
  );
}

function MessageMark() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-surface-raised text-ink-label">
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M4 5h16v11H9l-4 4V5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin text-accent-primary" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CategoryIcon({ kind }: { kind: SampleCategory }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-deep text-accent-primary">
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        {kind === 'food' && <path {...common} d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2 1.5-3 4-3 7v3h3" />}
        {kind === 'transport' && <path {...common} d="M5 16V11l2-5h10l2 5v5H5ZM5 11h14M8 19v-3M16 19v-3" />}
        {kind === 'shopping' && <path {...common} d="M5 8h14l-1 13H6L5 8ZM9 10V7a3 3 0 0 1 6 0v3" />}
        {kind === 'groceries' && <path {...common} d="M3 10h18l-2 10H5L3 10Zm5 0 3-6m4 6 3-6M9 14v3m6-3v3" />}
      </svg>
    </span>
  );
}

function PinIcon({ className = 'text-accent-primary' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 ${className}`} aria-hidden="true">
      <path
        d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.5" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ink-label" aria-hidden="true">
      <path
        d="M6 3h9l3 3v15H6V3Z M15 3v3h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
      <path d="m3 7 7 7 4-4 7 7M21 12v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EnterIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M19 6v6H8l3-3M8 12l3 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MiniKeyboard({
  keyboardRef,
  registerKeyRef,
}: {
  keyboardRef: React.RefObject<HTMLDivElement | null>;
  registerKeyRef: (char: string, el: HTMLSpanElement | null) => void;
}) {
  const keyClass = 'flex h-7 flex-1 items-center justify-center rounded-[4px] bg-surface font-body text-[10px] lowercase text-ink-body';
  return (
    <div ref={keyboardRef} className="absolute inset-x-0 bottom-0 z-20 bg-surface-raised pb-3 pt-0 shadow-[0_-8px_20px_-10px_rgba(20,20,15,0.25)]">
      <div className="flex items-center divide-x divide-border-subtle border-b border-border-subtle px-2 py-1.5 font-body text-[10px] text-ink-label">
        <span className="flex-1 px-1 text-center">Team</span>
        <span className="flex-1 px-1 text-center">Lunch</span>
        <span className="flex-1 px-1 text-center">Standup</span>
      </div>
      <div className="px-1.5 pt-2">
        {KEY_ROWS.map((row, i) => (
          <div key={i} className="mb-[5px] flex justify-center gap-[3px]" style={i === 2 ? { paddingLeft: '5%', paddingRight: '5%' } : undefined}>
            {row.map((k) => (
              <span
                key={k}
                ref={(el) => registerKeyRef(k, el)}
                className={keyClass}
                style={{ transformOrigin: 'center' }}
              >
                {k}
              </span>
            ))}
          </div>
        ))}
        <div className="flex justify-center gap-[3px]">
          <span className="flex h-7 flex-[1.3] items-center justify-center rounded-[4px] bg-surface font-body text-[10px] text-ink-label">⇧</span>
          <span className="flex h-7 flex-[1.3] items-center justify-center rounded-[4px] bg-surface font-body text-[10px] text-ink-label">⌫</span>
        </div>
        <div className="mt-[5px] flex justify-center gap-[3px]">
          <span className="flex h-7 flex-1 items-center justify-center rounded-[4px] bg-surface font-body text-[10px] text-ink-label">,</span>
          <span ref={(el) => registerKeyRef(' ', el)} className="flex h-7 flex-[5] items-center justify-center rounded-[4px] bg-surface" style={{ transformOrigin: 'center' }}>
            <span className="font-body text-[9px] text-ink-label">English (India)</span>
          </span>
          <span className="flex h-7 flex-1 items-center justify-center rounded-[4px] bg-surface font-body text-[10px] text-ink-label">.</span>
          <span className="flex h-7 flex-[1.3] items-center justify-center rounded-[4px] bg-accent-primary text-surface">
            <EnterIcon />
          </span>
        </div>
      </div>
    </div>
  );
}

export function HowItWorksPhone() {
  const pinRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const screenARef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const plainRef = useRef<HTMLDivElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);
  const scanLineRef = useRef<HTMLDivElement>(null);
  const scanLabelRef = useRef<HTMLDivElement>(null);
  const upgradedRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const locationRowRef = useRef<HTMLDivElement>(null);
  const noteBoxRef = useRef<HTMLDivElement>(null);
  const noteTextWrapRef = useRef<HTMLSpanElement>(null);
  const keyboardRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLSpanElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  const captionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const keyElRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  // null until mount keeps the server-render and first client paint identical (no hydration
  // mismatch); the clock/date/month then go live and keep ticking from there.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const statusTime = now ? formatStatusTime(now) : '10:24';
  const bodyTime = now ? formatBodyTime(now) : '10:24 AM';
  const smsDate = now ? formatSmsDate(now) : '27-Sep-26';
  const monthName = now ? now.toLocaleDateString('en-US', { month: 'long' }) : 'September';
  const prevMonthName = now
    ? new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('en-US', { month: 'long' })
    : 'August';

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const pin = pinRef.current;
        const dots = dotsRef.current?.querySelectorAll<HTMLElement>('[data-dot-fill]');
        const noteTextWrap = noteTextWrapRef.current;
        if (!pin || !dots || !noteTextWrap) return;

        const noteFullWidth = noteTextWrap.scrollWidth;

        gsap.set(bannerRef.current, { yPercent: -160, opacity: 0 });
        gsap.set(detailRef.current, { yPercent: 100, opacity: 0 });
        gsap.set(dashboardRef.current, { xPercent: 100, opacity: 0 });
        gsap.set(scanRef.current, { opacity: 0 });
        gsap.set(scanLabelRef.current, { opacity: 0, y: 6 });
        gsap.set(upgradedRef.current, { opacity: 0, scale: 0.92 });
        gsap.set(locationRowRef.current, { opacity: 0, y: 8 });
        gsap.set(noteBoxRef.current, { opacity: 0, y: 8 });
        gsap.set(keyboardRef.current, { yPercent: 100 });
        gsap.set(noteTextWrap, { width: 0 });
        gsap.set(tagRef.current, { opacity: 0, y: 4 });
        captionRefs.current.forEach((el, i) => gsap.set(el, { opacity: i === 0 ? 1 : 0 }));

        const setActive = (index: number) => {
          dots.forEach((dot, i) => gsap.to(dot, { width: i <= index ? '100%' : '0%', duration: 0.3, overwrite: true }));
        };
        setActive(0);

        // One-time tilt-in as the phone arrives; clearProps drops the inline transform once
        // done so it can't act as a containing block for the fixed-position pin that follows.
        gsap.from(phoneRef.current, {
          opacity: 0,
          y: 60,
          rotateX: 10,
          transformPerspective: 1400,
          duration: 0.9,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
          scrollTrigger: { trigger: pin, start: 'top 85%', once: true },
        });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: pin,
            start: 'top top',
            end: () => `+=${window.innerHeight * STEP_COUNT * (STEP_VH / 100)}`,
            scrub: 1,
            pin: true,
            invalidateOnRefresh: true,
          },
        });

        const fadeCaption = (from: number, to: number) => {
          // No position arg on the first tween: append after whatever hold precedes it, not at its start.
          tl.to(captionRefs.current[from], { opacity: 0, duration: 0.15 }).to(
            captionRefs.current[to],
            { opacity: 1, duration: 0.15, onStart: () => setActive(to) },
            '<'
          );
        };

        // SMS pops onto the lock screen like a real heads-up notification
        tl.to(bannerRef.current, { yPercent: 0, opacity: 1, duration: 0.22, ease: 'back.out(1.7)' });

        tl.addLabel('s0').to({}, { duration: 0.28 });

        // 01 -> 02: scan reveal, called out in the open space below the card (not crammed into it)
        fadeCaption(0, 1);
        tl.to(plainRef.current, { opacity: 0.15, duration: 0.12 }, '<')
          .to(scanRef.current, { opacity: 1, duration: 0.12 }, '<')
          .fromTo(scanLineRef.current, { yPercent: -120 }, { yPercent: 220, duration: 0.4, ease: 'none' }, '<')
          .to(scanLabelRef.current, { opacity: 1, y: 0, duration: 0.15 }, '<')
          .addLabel('s1')
          .to({}, { duration: 0.28 });

        // 02 -> 03: banner upgrades, with a little pop of delight
        fadeCaption(1, 2);
        tl.to(plainRef.current, { opacity: 0, duration: 0.1 }, '<')
          .to(scanRef.current, { opacity: 0, duration: 0.1 }, '<')
          .to(scanLabelRef.current, { opacity: 0, y: -6, duration: 0.1 }, '<')
          .to(upgradedRef.current, { opacity: 1, scale: 1, duration: 0.22, ease: 'back.out(2)' }, '<')
          .addLabel('s2')
          .to({}, { duration: 0.45 });

        // 03 -> 04: push transition, whole lock screen -> transaction detail. The empty note box
        // is what's visible first (location comes later, at the very end, with the map).
        // Caption crossfade is timed to land near the END of the screen swap (not the start)
        // so scrubbing slowly never shows a new caption over a half-faded previous screen.
        tl.to(screenARef.current, { yPercent: -100, opacity: 0, duration: 0.3, ease: 'power2.in' })
          .to(detailRef.current, { yPercent: 0, opacity: 1, duration: 0.32, ease: 'power2.out' }, '<0.05')
          .to(noteBoxRef.current, { opacity: 1, y: 0, duration: 0.2 }, '<0.15')
          .to(captionRefs.current[2], { opacity: 0, duration: 0.15 }, '<0.05')
          .to(captionRefs.current[3], { opacity: 1, duration: 0.15, onStart: () => setActive(3) }, '<')
          .addLabel('s3')
          .to({}, { duration: 0.35 });

        // Keyboard rises, text types itself key by key (with a press flash per key), keyboard drops, tag lands
        const noteBlockStart = tl.duration();
        tl.to(keyboardRef.current, { yPercent: 0, duration: 0.32, ease: 'power2.out' }).to(noteTextWrap, {
          width: noteFullWidth,
          duration: 0.8,
          ease: 'none',
        });

        const typingStart = noteBlockStart + 0.32;
        const typingDuration = 0.8;
        const chars = NOTE_TEXT.toLowerCase().split('');
        chars.forEach((ch, i) => {
          const keyEl = keyElRefs.current[ch];
          if (!keyEl) return;
          const at = typingStart + (i / Math.max(1, chars.length - 1)) * typingDuration;
          tl.to(keyEl, { scale: 0.85, backgroundColor: 'var(--color-accent-deep)', duration: 0.035, yoyo: true, repeat: 1 }, at);
        });

        tl.to(keyboardRef.current, { yPercent: 100, duration: 0.28, ease: 'power2.in' }, '+=0.05')
          .to(tagRef.current, { opacity: 1, y: 0, duration: 0.16 }, '<0.1')
          .addLabel('s4a')
          .to({}, { duration: 0.2 });

        // Location card reveals with the map, caption swaps to "Tagged with place"
        tl.to(locationRowRef.current, { opacity: 1, y: 0, duration: 0.22 })
          .to(captionRefs.current[3], { opacity: 0, duration: 0.15 }, '<0.05')
          .to(captionRefs.current[4], { opacity: 1, duration: 0.15, onStart: () => setActive(4) }, '<')
          .addLabel('s4')
          .to({}, { duration: 0.3 });

        // 05 -> 06: push transition, detail -> dashboard (same late-caption timing as above)
        tl.to(detailRef.current, { xPercent: -100, opacity: 0, duration: 0.3, ease: 'power2.in' })
          .to(dashboardRef.current, { xPercent: 0, opacity: 1, duration: 0.35, ease: 'power2.out' }, '<0.05')
          .to(captionRefs.current[4], { opacity: 0, duration: 0.15 }, '<0.2')
          .to(captionRefs.current[5], { opacity: 1, duration: 0.15, onStart: () => setActive(5) }, '<')
          .addLabel('s5')
          .to({}, { duration: 0.85 });

        // Light continuous tilt drift spanning the full sequence, added last so it doesn't
        // disturb the sequential insertion cursor used by the default-positioned tweens above.
        tl.to(phoneRef.current, { rotateY: 3, rotateX: -1.5, duration: tl.duration() }, 0);

        return () => {
          tl.scrollTrigger?.kill();
          tl.kill();
        };
      });

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(bannerRef.current, { yPercent: 0, opacity: 0 });
        gsap.set(detailRef.current, { xPercent: -100, yPercent: 0, opacity: 0 });
        gsap.set(dashboardRef.current, { xPercent: 0, opacity: 1 });
        gsap.set(phoneRef.current, { rotateX: 0, rotateY: 0 });
        captionRefs.current.forEach((el) => gsap.set(el, { opacity: 1, position: 'static' }));
      });

      return () => mm.revert();
    },
    { scope: pinRef }
  );

  return (
    <div className="w-full">
      <div
        ref={pinRef}
        className="relative flex h-[100dvh] items-center justify-center overflow-hidden motion-reduce:h-auto motion-reduce:overflow-visible motion-reduce:py-8"
        style={{ perspective: '1600px' }}
      >
        <div className="flex w-full flex-col items-center px-4">
          <div
            ref={phoneRef}
            className="relative aspect-[9/19.5] w-[84vw] max-w-[330px] rounded-[2.6rem] bg-ink-headline p-[3px] shadow-[0_30px_60px_-20px_rgba(20,20,15,0.35)] sm:w-[345px]"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="relative h-full w-full overflow-hidden rounded-[2.4rem] border border-border-subtle bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
              <StatusBar time={statusTime} />
              <ProgressDots dotsRef={dotsRef} />

              <div className="relative mt-5 h-[calc(100%-4.5rem)] overflow-hidden">
                {/* Screen A: lock screen with morphing notification banner */}
                <div ref={screenARef} className="absolute inset-0 flex flex-col items-center overflow-hidden px-4 pt-6">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_srgb,var(--color-accent-primary)_10%,transparent),transparent_60%)]"
                  />
                  <div
                    ref={bannerRef}
                    className="absolute inset-x-4 top-6 rounded-[18px] border border-border-subtle bg-surface p-3.5 shadow-[0_10px_30px_-12px_rgba(20,20,15,0.3)]"
                  >
                    <div ref={plainRef} className="relative flex items-start gap-3">
                      <MessageMark />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-body text-sm font-semibold text-ink-headline">{tx.source}</span>
                          <span className="shrink-0 font-body text-[10px] text-ink-label">now</span>
                        </div>
                        <p className="mt-0.5 font-mono text-[11px] leading-snug text-ink-body">
                          Rs.420.00 debited from A/c XX2461 on {smsDate} to VPA swiggy@ybl. Avl Bal Rs.24,560.00
                        </p>
                      </div>
                    </div>

                    <div ref={scanRef} className="pointer-events-none absolute inset-0 overflow-hidden rounded-[18px]">
                      <span className="absolute inset-0 animate-pulse rounded-[18px] shadow-[0_0_0_1.5px_color-mix(in_srgb,var(--color-accent-primary)_45%,transparent),0_0_22px_color-mix(in_srgb,var(--color-accent-primary)_25%,transparent)]" />
                      <div ref={scanLineRef} className="absolute inset-x-0 h-1/2 bg-gradient-to-b from-transparent via-accent-primary/50 to-transparent" />
                    </div>

                    <div ref={upgradedRef} className="absolute inset-3.5 flex items-center gap-3">
                      <CategoryIcon kind={tx.kind} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-body text-sm font-semibold text-ink-headline">{tx.merchant}</span>
                          <span className="shrink-0 font-mono text-sm font-semibold text-ink-headline">{stripSign(tx.amount)}</span>
                        </div>
                        <div className="mt-0.5 truncate font-body text-xs text-ink-label">
                          {tx.source} · {tx.category} · {bodyTime}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Whitespace below the card carries the parsing state, instead of cramming it into a corner */}
                  <div ref={scanLabelRef} className="absolute inset-x-0 top-[13.5rem] flex flex-col items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-deep">
                      <SpinnerIcon />
                    </span>
                    <span className="font-body text-xs font-medium text-ink-label">Parsing on-device…</span>
                  </div>

                  <p className="pointer-events-none absolute bottom-6 left-0 right-0 px-8 text-center font-body text-[11px] leading-snug text-ink-label/70">
                    Notifications keep coming through as normal — Raqm just quietly upgrades them.
                  </p>
                </div>

                {/* Screen B: transaction detail */}
                <div ref={detailRef} className="absolute inset-0 flex flex-col px-4 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink-label">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                        <path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="font-body text-xs font-medium uppercase tracking-wider text-ink-label">Transaction</span>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <CategoryIcon kind={tx.kind} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-body text-base font-semibold text-ink-headline">{tx.merchant}</div>
                      <span className="mt-0.5 inline-block w-fit rounded-full bg-accent-deep px-2 py-0.5 font-body text-[10px] font-medium text-accent-primary">
                        {tx.category}
                      </span>
                    </div>
                    <span className="shrink-0 font-mono text-lg font-semibold text-ink-headline">{tx.amount}</span>
                  </div>

                  <div className="my-4 h-px bg-border-subtle" />

                  <div ref={noteBoxRef} className="flex flex-col gap-2.5">
                    <div className="flex items-start gap-3 rounded-[14px] bg-surface px-3.5 py-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-raised">
                        <NoteIcon />
                      </span>
                      <div className="min-w-0 flex-1 pt-1">
                        <div className="font-body text-[10px] uppercase tracking-wider text-ink-label">Note</div>
                        <div className="mt-0.5 flex items-center">
                          <span ref={noteTextWrapRef} className="inline-block overflow-hidden whitespace-nowrap align-bottom">
                            <span className="font-body text-xs text-ink-body">{NOTE_TEXT}</span>
                          </span>
                          <span className="ml-px inline-block h-3 w-[1.5px] shrink-0 animate-pulse bg-accent-primary align-bottom" />
                        </div>
                      </div>
                    </div>
                    <span ref={tagRef} className="w-fit rounded-full bg-surface-raised px-2.5 py-1 font-body text-[10px] font-medium text-ink-body">
                      #Work
                    </span>
                  </div>

                  <div ref={locationRowRef} className="relative mt-2.5 h-[9.5rem] overflow-hidden rounded-[14px]">
                    <img src={MAP_IMAGE_URL} alt="Map of Koramangala, Bengaluru" loading="lazy" className="h-full w-full object-cover" />
                    {/* Vignette: darkens the edges so the card reads as a framed map, not a flat photo crop */}
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{ boxShadow: 'inset 0 0 22px 6px rgba(0,0,0,0.35)' }}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
                    <span className="absolute left-1/2 top-[46%] flex h-6 w-6 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full bg-surface shadow-[0_2px_8px_rgba(20,20,15,0.35)]">
                      <PinIcon className="h-3.5 w-3.5 text-accent-primary" />
                    </span>
                    <div className="absolute bottom-1.5 left-3 right-3">
                      <div className="font-body text-[9px] uppercase tracking-wider text-surface/70">Location</div>
                      <div className="truncate font-body text-xs font-medium text-surface">Koramangala, Bengaluru</div>
                    </div>
                  </div>
                </div>

                {/* Keyboard rises for the note step, positioned edge-to-edge over both screens */}
                <MiniKeyboard
                  keyboardRef={keyboardRef}
                  registerKeyRef={(char, el) => {
                    keyElRefs.current[char] = el;
                  }}
                />

                {/* Screen C: dashboard glimpse */}
                <div ref={dashboardRef} className="absolute inset-0 flex flex-col px-4 pt-1">
                  <div className="relative overflow-hidden rounded-[18px] glass-card p-4">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-6 -top-10 h-32 w-40 rounded-full bg-accent-primary/15 blur-2xl"
                    />
                    <div className="relative flex items-center gap-1 font-body text-[11px] font-medium text-ink-label">
                      {monthName} <ChevronDown />
                    </div>
                    <div className="relative mt-2 flex items-stretch justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-[1.7rem] font-semibold leading-none tracking-tight text-ink-headline">{d.spent}</div>
                        <div className="mt-1.5 font-body text-[11px] text-ink-label">spent this month</div>
                        <span className="mt-2 inline-flex items-center gap-1 rounded-[10px] bg-accent-deep px-2 py-1 font-body text-[10px] font-medium text-accent-primary">
                          <TrendDownIcon />
                          {d.lessThanLastMonth} less than {prevMonthName}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2.5 border-l border-border-subtle pl-3">
                        <div className="text-right">
                          <div className="font-body text-[9px] uppercase tracking-wider text-ink-label">Remaining</div>
                          <div className="mt-0.5 font-mono text-xs font-semibold text-ink-headline">{d.remaining}</div>
                          <div className="mt-0.5 whitespace-nowrap font-body text-[9px] text-ink-label">of {d.budget}</div>
                        </div>
                        <div className="relative h-11 w-11 shrink-0 self-center">
                          <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90" aria-hidden="true">
                            <circle cx="22" cy="22" r={RING_RADIUS} fill="none" strokeWidth="4" className="stroke-surface-raised" />
                            <circle
                              cx="22"
                              cy="22"
                              r={RING_RADIUS}
                              fill="none"
                              strokeWidth="4"
                              strokeLinecap="round"
                              className="stroke-accent-primary"
                              strokeDasharray={RING_CIRCUMFERENCE}
                              strokeDashoffset={dashOffset}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-semibold text-ink-headline">
                            {d.usedPct}%
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="relative mb-3 mt-3.5 h-px bg-border-subtle" />
                    <div className="relative flex items-stretch gap-4">
                      <div>
                        <div className="font-body text-[9px] uppercase tracking-wider text-ink-label">Safe to spend today</div>
                        <div className="mt-0.5 font-mono text-sm font-semibold text-ink-headline">{d.safeToSpendPerDay}</div>
                      </div>
                      <span className="w-px bg-border-subtle" />
                      <div>
                        <div className="font-body text-[9px] uppercase tracking-wider text-ink-label">Earned</div>
                        <div className="mt-0.5 font-mono text-sm font-semibold text-ink-headline">{d.earned}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between px-0.5">
                    <span className="font-body text-xs font-semibold text-ink-headline">Recent transactions</span>
                    <span className="font-body text-[11px] font-medium text-accent-primary">See all ›</span>
                  </div>
                  <div className="mt-1.5 flex flex-col divide-y divide-border-subtle rounded-[16px] bg-surface">
                    {[tx, tx2, tx3].map((row) => (
                      <div key={row.merchant} className="flex items-center gap-3 px-3 py-2.5">
                        <CategoryIcon kind={row.kind} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-body text-xs font-semibold text-ink-headline">{row.merchant}</div>
                          <div className="truncate font-body text-[10px] text-ink-label">{row.category}</div>
                        </div>
                        <span className="shrink-0 font-mono text-xs font-semibold text-ink-headline">{row.amount}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between px-0.5">
                    <span className="font-body text-xs font-semibold text-ink-headline">Categories</span>
                    <span className="font-body text-[11px] font-medium text-accent-primary">See all ›</span>
                  </div>
                  <div className="mt-1.5 flex flex-col gap-2">
                    {SAMPLE_CATEGORIES.map((cat) => (
                      <div key={cat.name} className="flex items-center gap-3 rounded-[14px] bg-surface px-3 py-2.5">
                        <CategoryIcon kind={cat.kind} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-body text-xs font-semibold text-ink-headline">{cat.name}</div>
                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-raised">
                            <div className="h-full rounded-full bg-accent-primary" style={{ width: `${cat.pct}%` }} />
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-mono text-xs font-semibold text-ink-headline">{cat.spent}</div>
                          <div className="font-body text-[9px] text-ink-label">of {cat.budget}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-8 h-24 w-full max-w-md text-center sm:h-20 motion-reduce:mt-10 motion-reduce:h-auto motion-reduce:max-w-xl">
            <div className="motion-reduce:relative motion-reduce:mb-10 motion-reduce:last:mb-0" />
            {STEPS.map((step, i) => (
              <div
                key={step.number}
                ref={(el) => {
                  captionRefs.current[i] = el;
                }}
                className="absolute inset-0 motion-reduce:relative motion-reduce:mb-8"
              >
                <span className="font-mono text-xs text-accent-primary">{step.number}</span>
                <h3 className="mt-1.5 font-display text-2xl text-ink-headline sm:text-3xl">{step.caption}</h3>
                <p className="mx-auto mt-1.5 max-w-xs font-body text-sm text-ink-body">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
