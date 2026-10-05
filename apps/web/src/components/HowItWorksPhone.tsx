'use client';

import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { lenisInstance } from '@/components/SmoothScrollProvider';
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
  { number: '01', caption: 'Payment happens', side: 'left', x: 44, y: 108 },
  { number: '02', caption: 'Raqm reads it', side: 'right', x: 216, y: 108 },
  { number: '03', caption: 'Upgraded, instantly', side: 'left', x: 60, y: 108 },
  { number: '04', caption: 'Add a note, a tag', side: 'right', x: 190, y: 196 },
  { number: '05', caption: 'Tagged with place', side: 'left', x: 80, y: 330 },
  { number: '06', caption: 'Always in view', side: 'right', x: 208, y: 116 },
] as const;

const CALLOUT_INK_PX = 8;
const CALLOUT_REACH_PX = 112;
const FRAME_W = 264;

const KEY_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

function StatusBar({ time }: { time: string }) {
  return (
    <div className="relative z-10 flex shrink-0 items-center justify-between px-5 pt-3 font-mono text-[10px] text-ink-headline">
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
    <div ref={dotsRef} className="relative z-10 mt-2 flex shrink-0 gap-1 px-5">
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
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-surface-raised text-ink-label">
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
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-deep text-accent-primary">
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
  const keyClass = 'flex h-6 flex-1 items-center justify-center rounded-[4px] bg-surface font-body text-[9px] lowercase text-ink-body';
  return (
    <div ref={keyboardRef} className="absolute inset-x-0 bottom-0 z-20 bg-surface-raised border-t border-border-subtle pb-2 pt-0">
      <div className="flex items-center divide-x divide-border-subtle border-b border-border-subtle px-2 py-1 font-body text-[9px] text-ink-label">
        <span className="flex-1 px-1 text-center">Team</span>
        <span className="flex-1 px-1 text-center">Lunch</span>
        <span className="flex-1 px-1 text-center">Standup</span>
      </div>
      <div className="px-1 pt-1.5">
        {KEY_ROWS.map((row, i) => (
          <div key={i} className="mb-1 flex justify-center gap-[3px]" style={i === 2 ? { paddingLeft: '5%', paddingRight: '5%' } : undefined}>
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
          <span className="flex h-6 flex-[1.3] items-center justify-center rounded-[4px] bg-surface font-body text-[9px] text-ink-label">⇧</span>
          <span className="flex h-6 flex-[1.3] items-center justify-center rounded-[4px] bg-surface font-body text-[9px] text-ink-label">⌫</span>
        </div>
        <div className="mt-1 flex justify-center gap-[3px]">
          <span className="flex h-6 flex-1 items-center justify-center rounded-[4px] bg-surface font-body text-[9px] text-ink-label">,</span>
          <span ref={(el) => registerKeyRef(' ', el)} className="flex h-6 flex-[5] items-center justify-center rounded-[4px] bg-surface" style={{ transformOrigin: 'center' }}>
            <span className="font-body text-[8px] text-ink-label">English (India)</span>
          </span>
          <span className="flex h-6 flex-1 items-center justify-center rounded-[4px] bg-surface font-body text-[9px] text-ink-label">.</span>
          <span className="flex h-6 flex-[1.3] items-center justify-center rounded-[4px] bg-accent-primary text-surface">
            <EnterIcon />
          </span>
        </div>
      </div>
    </div>
  );
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// Scroll progress at which the timeline reaches each step's transition (index 0 = start, last = end).
const P_ANCHORS = [0.03, 0.17, 0.32, 0.47, 0.62, 0.77, 0.93];

function stepForProgress(p: number) {
  return Math.min(STEPS.length - 1, Math.max(0, Math.floor((p - 0.05) / 0.15)));
}

function frameScale() {
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  if (vw >= 1024) return (0.87 * vh) / 520;
  return Math.min(vh / 650, (vw - 16) / FRAME_W);
}

export function HowItWorksPhone() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);
  const captionsRef = useRef<HTMLDivElement>(null);
  const calloutsRef = useRef<HTMLDivElement>(null);
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
        const wrap = wrapRef.current;
        const fit = fitRef.current;
        const overlay = overlayRef.current;
        const captions = captionsRef.current;
        const callouts = calloutsRef.current;
        const dots = dotsRef.current?.querySelectorAll<HTMLElement>('[data-dot-fill]');
        const noteTextWrap = noteTextWrapRef.current;
        if (!wrap || !fit || !overlay || !captions || !callouts || !dots || !noteTextWrap) return;

        const noteFullWidth = noteTextWrap.scrollWidth;
        const pillItems = captions.querySelectorAll<HTMLElement>('[data-pill]');
        const calloutEls = callouts.querySelectorAll<HTMLElement>('[data-callout]');

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
        gsap.set(captions, { opacity: 0 });
        gsap.set(callouts, { opacity: 0 });
        pillItems.forEach((el, i) => gsap.set(el, { opacity: i === 0 ? 1 : 0 }));
        calloutEls.forEach((el) => {
          const [dot, line, label] = Array.from(el.children);
          gsap.set(dot, { scale: 0 });
          gsap.set(line, { scaleX: 0, transformOrigin: el.dataset.side === 'left' ? 'right center' : 'left center' });
          gsap.set(label, { opacity: 0, y: 6 });
        });

        let activeStep = -1;
        const setStep = (index: number) => {
          if (index === activeStep) return;
          activeStep = index;
          dots.forEach((dot, i) => gsap.to(dot, { width: i <= index ? '100%' : '0%', duration: 0.3, overwrite: true }));
          pillItems.forEach((el, i) => gsap.to(el, { opacity: i === index ? 1 : 0, duration: 0.3, ease: 'power1.inOut', overwrite: true }));
          calloutEls.forEach((el, i) => {
            const [dot, line, label] = Array.from(el.children);
            if (i === index) {
              gsap.to(dot, { scale: 1, duration: 0.15, overwrite: true });
              gsap.to(line, { scaleX: 1, duration: 0.3, ease: 'power2.out', overwrite: true });
              gsap.to(label, { opacity: 1, y: 0, duration: 0.25, delay: 0.15, overwrite: true });
            } else {
              gsap.to(dot, { scale: 0, duration: 0.2, overwrite: true });
              gsap.to(label, { opacity: 0, y: 6, duration: 0.2, overwrite: true });
              gsap.to(line, { scaleX: 0, duration: 0.2, overwrite: true });
            }
          });
        };
        setStep(0);

        gsap.from(headingRef.current, {
          opacity: 0,
          y: 24,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: { trigger: headingRef.current, start: 'top 85%', once: true },
        });

        const tl = gsap.timeline({ paused: true });

        // SMS pops onto the lock screen like a real heads-up notification
        tl.to(bannerRef.current, { yPercent: 0, opacity: 1, duration: 0.22, ease: 'back.out(1.7)' });
        tl.to({}, { duration: 0.28 });

        // 01 -> 02: scan reveal
        tl.addLabel('a1')
          .to(plainRef.current, { opacity: 0.15, duration: 0.12 })
          .to(scanRef.current, { opacity: 1, duration: 0.12 }, '<')
          .fromTo(scanLineRef.current, { yPercent: -120 }, { yPercent: 220, duration: 0.4, ease: 'none' }, '<')
          .to(scanLabelRef.current, { opacity: 1, y: 0, duration: 0.15 }, '<')
          .to({}, { duration: 0.28 });

        // 02 -> 03: banner upgrades, with a little pop of delight
        tl.addLabel('a2')
          .to(plainRef.current, { opacity: 0, duration: 0.1 })
          .to(scanRef.current, { opacity: 0, duration: 0.1 }, '<')
          .to(scanLabelRef.current, { opacity: 0, y: -6, duration: 0.1 }, '<')
          .to(upgradedRef.current, { opacity: 1, scale: 1, duration: 0.22, ease: 'back.out(2)' }, '<')
          .to({}, { duration: 0.45 });

        // 03 -> 04: push transition, whole lock screen -> transaction detail
        tl.addLabel('a3')
          .to(screenARef.current, { yPercent: -100, opacity: 0, duration: 0.3, ease: 'power2.in' })
          .to(detailRef.current, { yPercent: 0, opacity: 1, duration: 0.32, ease: 'power2.out' }, '<0.05')
          .to(noteBoxRef.current, { opacity: 1, y: 0, duration: 0.2 }, '<0.15')
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
          .to({}, { duration: 0.2 });

        // Location card reveals with the map
        tl.addLabel('a4')
          .to(locationRowRef.current, { opacity: 1, y: 0, duration: 0.22 })
          .to({}, { duration: 0.3 });

        // 05 -> 06: push transition, detail -> dashboard
        tl.addLabel('a5')
          .to(detailRef.current, { xPercent: -100, opacity: 0, duration: 0.3, ease: 'power2.in' })
          .to(dashboardRef.current, { xPercent: 0, opacity: 1, duration: 0.35, ease: 'power2.out' }, '<0.05')
          .to({}, { duration: 0.85 });

        const anchorTimes = [0, tl.labels.a1, tl.labels.a2, tl.labels.a3, tl.labels.a4, tl.labels.a5, tl.duration()];
        const timeForProgress = (p: number) => {
          if (p <= P_ANCHORS[0]) return 0;
          for (let i = 1; i < P_ANCHORS.length; i++) {
            if (p <= P_ANCHORS[i]) {
              const k = (p - P_ANCHORS[i - 1]) / (P_ANCHORS[i] - P_ANCHORS[i - 1]);
              return anchorTimes[i - 1] + k * (anchorTimes[i] - anchorTimes[i - 1]);
            }
          }
          return anchorTimes[anchorTimes.length - 1];
        };

        // completed is set only by onLeave (bottom passed the viewport top), never from progress.
        let completed = false;
        let staticMode = false;

        const update = () => {
          if (staticMode) return;
          const vh = window.innerHeight;
          const range = Math.max(1, wrap.offsetHeight - vh);
          const off = -wrap.getBoundingClientRect().top;
          const p = off / range;
          if (p <= 0) completed = false;
          const engage = clamp01(p / 0.03);
          const exit = clamp01((p - 0.93) / 0.06);
          const overlayIn = clamp01((off + 0.0866 * vh) / (0.0926 * vh));
          const overlayOut = 1 - clamp01((p - 0.9279) / 0.0463);
          const scale = frameScale() * (0.93 + 0.07 * engage - 0.1 * exit);
          const y = -12 + 12 * engage + 48 * exit;

          fit.style.transform = `translateY(${y}px) scale(${scale})`;
          overlay.style.opacity = String(0.7 * Math.min(overlayIn, overlayOut));
          const uiOpacity = String(engage * (1 - exit));
          captions.style.opacity = uiOpacity;
          callouts.style.opacity = uiOpacity;
          tl.time(timeForProgress(clamp01(p)), false);
          setStep(stepForProgress(clamp01(p)));
        };

        const jumpTo = (y: number) => {
          if (lenisInstance) lenisInstance.scrollTo(y, { immediate: true, force: true });
          else window.scrollTo(0, y);
        };

        const exitStatic = () => {
          if (!staticMode) return;
          staticMode = false;
          completed = false;
          wrap.style.height = '';
          if (stickyRef.current) stickyRef.current.style.position = '';
          st.refresh();
          update();
        };

        const enterStatic = () => {
          const sticky = stickyRef.current;
          if (!sticky) return;
          staticMode = true;
          const bottomBefore = wrap.getBoundingClientRect().bottom;
          wrap.style.height = 'auto';
          sticky.style.position = 'relative';
          fit.style.transform = `scale(${frameScale()})`;
          overlay.style.opacity = '0';
          captions.style.opacity = '0';
          callouts.style.opacity = '0';
          tl.time(tl.duration(), false);
          setStep(STEPS.length - 1);

          jumpTo(window.scrollY + (wrap.getBoundingClientRect().bottom - bottomBefore));
          st.refresh();
        };

        const st = ScrollTrigger.create({
          trigger: wrap,
          start: 'top bottom',
          end: 'bottom top',
          invalidateOnRefresh: true,
          onUpdate: update,
          onRefresh: update,
          onEnter: () => {
            completed = false;
            exitStatic();
          },
          onLeave: () => {
            completed = true;
            update();
          },
          onEnterBack: () => {
            if (completed && !staticMode) enterStatic();
          },
          onLeaveBack: () => {
            completed = false;
            exitStatic();
          },
        });
        update();

        return () => {
          staticMode = false;
          wrap.style.height = '';
          if (stickyRef.current) stickyRef.current.style.position = '';
          st.kill();
          tl.kill();
          fit.style.transform = '';
          overlay.style.opacity = '';
        };
      });

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set([screenARef.current, scanLabelRef.current, scanRef.current, upgradedRef.current], { opacity: 0 });
        gsap.set(keyboardRef.current, { yPercent: 100 });
        gsap.set(detailRef.current, { xPercent: -100, yPercent: 0, opacity: 0 });
        gsap.set(dashboardRef.current, { xPercent: 0, opacity: 1 });
      });

      return () => mm.revert();
    },
    { scope: wrapRef }
  );

  return (
    <div className="w-full">
      <div ref={headingRef} className="mx-auto w-full max-w-6xl px-4 pb-10 pt-16 sm:pb-12 sm:pt-24">
        <span className="mb-3 block font-mono text-xs text-ink-label opacity-60">01 / 05</span>
        <h2 className="mb-4 text-balance font-display text-4xl text-ink-headline sm:text-5xl">How it works</h2>
        <p className="max-w-xl font-body text-base text-ink-body sm:text-lg">
          One SMS, quietly upgraded. Follow a single spend from notification to dashboard.
        </p>
      </div>

      <div ref={wrapRef} className="relative h-[320vh] sm:h-[460vh] motion-reduce:h-auto">
        <div ref={stickyRef} className="sticky top-0 flex h-[100dvh] items-center justify-center overflow-hidden motion-reduce:static motion-reduce:h-auto motion-reduce:overflow-visible motion-reduce:py-12">
          <div ref={overlayRef} aria-hidden="true" className="absolute inset-0 z-10 bg-ink-headline opacity-0 motion-reduce:hidden" />

          <div ref={fitRef} className="relative z-20 flex flex-col items-center motion-reduce:[zoom:1.2]">
            <div className="relative">
              <div className="h-[520px] w-[264px] rounded-[2rem] bg-ink-headline p-[2px] shadow-[0_30px_60px_-20px_rgba(20,20,15,0.35)]">
                <div className="flex h-full flex-col overflow-hidden rounded-[1.9rem] border border-border-subtle bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                  <StatusBar time={statusTime} />
                  <ProgressDots dotsRef={dotsRef} />

                  <div className="relative mt-3 min-h-0 flex-1 overflow-hidden">
                    {/* Screen A: lock screen with morphing notification banner */}
                    <div ref={screenARef} className="absolute inset-0 flex flex-col items-center overflow-hidden px-3 pt-3">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_srgb,var(--color-accent-primary)_10%,transparent),transparent_60%)]"
                      />
                      <div
                        ref={bannerRef}
                        className="absolute inset-x-3 top-3 rounded-[14px] border border-border-subtle bg-surface p-2.5 shadow-[0_10px_30px_-12px_rgba(20,20,15,0.3)]"
                      >
                        <div ref={plainRef} className="relative flex items-start gap-2">
                          <MessageMark />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate font-body text-xs font-semibold text-ink-headline">{tx.source}</span>
                              <span className="shrink-0 font-body text-[9px] text-ink-label">now</span>
                            </div>
                            <p className="mt-0.5 font-mono text-[9px] leading-snug text-ink-body">
                              Rs.420.00 debited from A/c XX2461 on {smsDate} to VPA swiggy@ybl. Avl Bal Rs.24,560.00
                            </p>
                          </div>
                        </div>

                        <div ref={scanRef} className="pointer-events-none absolute inset-0 overflow-hidden rounded-[14px]">
                          <span className="absolute inset-0 animate-pulse rounded-[14px] shadow-[0_0_0_1.5px_color-mix(in_srgb,var(--color-accent-primary)_45%,transparent),0_0_22px_color-mix(in_srgb,var(--color-accent-primary)_25%,transparent)]" />
                          <div ref={scanLineRef} className="absolute inset-x-0 h-1/2 bg-gradient-to-b from-transparent via-accent-primary/50 to-transparent" />
                        </div>

                        <div ref={upgradedRef} className="absolute inset-2.5 flex items-center gap-2">
                          <CategoryIcon kind={tx.kind} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate font-body text-xs font-semibold text-ink-headline">{tx.merchant}</span>
                              <span className="shrink-0 font-mono text-xs font-semibold text-ink-headline">{stripSign(tx.amount)}</span>
                            </div>
                            <div className="mt-0.5 truncate font-body text-[10px] text-ink-label">
                              {tx.source} · {tx.category} · {bodyTime}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div ref={scanLabelRef} className="absolute inset-x-0 top-[8.5rem] flex flex-col items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-deep">
                          <SpinnerIcon />
                        </span>
                        <span className="font-body text-[11px] font-medium text-ink-label">Parsing on-device…</span>
                      </div>

                      <p className="pointer-events-none absolute bottom-4 left-0 right-0 px-6 text-center font-body text-[9px] leading-snug text-ink-label/70">
                        Notifications keep coming through as normal. Raqm just quietly upgrades them.
                      </p>
                    </div>

                    {/* Screen B: transaction detail */}
                    <div ref={detailRef} className="absolute inset-0 flex flex-col px-3 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink-label">
                          <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
                            <path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        <span className="font-body text-[10px] font-medium uppercase tracking-wider text-ink-label">Transaction</span>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <CategoryIcon kind={tx.kind} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-body text-sm font-semibold text-ink-headline">{tx.merchant}</div>
                          <span className="mt-0.5 inline-block w-fit rounded-full bg-accent-deep px-2 py-0.5 font-body text-[9px] font-medium text-accent-primary">
                            {tx.category}
                          </span>
                        </div>
                        <span className="shrink-0 font-mono text-sm font-semibold text-ink-headline">{tx.amount}</span>
                      </div>

                      <div className="my-3 h-px bg-border-subtle" />

                      <div ref={noteBoxRef} className="flex flex-col gap-2">
                        <div className="flex items-start gap-2 rounded-[12px] bg-surface px-3 py-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-raised">
                            <NoteIcon />
                          </span>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <div className="font-body text-[9px] uppercase tracking-wider text-ink-label">Note</div>
                            <div className="mt-0.5 flex items-center">
                              <span ref={noteTextWrapRef} className="inline-block overflow-hidden whitespace-nowrap align-bottom">
                                <span className="font-body text-[11px] text-ink-body">{NOTE_TEXT}</span>
                              </span>
                              <span className="ml-px inline-block h-3 w-[1.5px] shrink-0 animate-pulse bg-accent-primary align-bottom" />
                            </div>
                          </div>
                        </div>
                        <span ref={tagRef} className="w-fit rounded-full bg-surface-raised px-2.5 py-1 font-body text-[9px] font-medium text-ink-body">
                          #Work
                        </span>
                      </div>

                      <div ref={locationRowRef} className="relative mt-2 h-[8.5rem] overflow-hidden rounded-[12px]">
                        <img src={MAP_IMAGE_URL} alt="Map of Koramangala, Bengaluru" loading="lazy" className="h-full w-full object-cover" />
                        <div className="pointer-events-none absolute inset-0" style={{ boxShadow: 'inset 0 0 22px 6px rgba(0,0,0,0.35)' }} />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
                        <span className="absolute left-1/2 top-[46%] flex h-6 w-6 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full bg-surface shadow-[0_2px_8px_rgba(20,20,15,0.35)]">
                          <PinIcon className="h-3.5 w-3.5 text-accent-primary" />
                        </span>
                        <div className="absolute bottom-1.5 left-3 right-3">
                          <div className="font-body text-[8px] uppercase tracking-wider text-surface/70">Location</div>
                          <div className="truncate font-body text-[11px] font-medium text-surface">Koramangala, Bengaluru</div>
                        </div>
                      </div>
                    </div>

                    <MiniKeyboard
                      keyboardRef={keyboardRef}
                      registerKeyRef={(char, el) => {
                        keyElRefs.current[char] = el;
                      }}
                    />

                    {/* Screen C: dashboard glimpse */}
                    <div ref={dashboardRef} className="absolute inset-0 flex flex-col px-3 pt-0.5">
                      <div className="relative overflow-hidden rounded-[14px] glass-card p-3">
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute -right-6 -top-10 h-28 w-32 rounded-full bg-accent-primary/15 blur-2xl"
                        />
                        <div className="relative flex items-center gap-1 font-body text-[10px] font-medium text-ink-label">
                          {monthName} <ChevronDown />
                        </div>
                        <div className="relative mt-1.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-mono text-xl font-semibold leading-none tracking-tight text-ink-headline">{d.spent}</div>
                            <div className="mt-1 font-body text-[10px] text-ink-label">spent this month</div>
                          </div>
                          <div className="relative h-10 w-10 shrink-0">
                            <svg viewBox="0 0 44 44" className="h-10 w-10 -rotate-90" aria-hidden="true">
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
                            <div className="absolute inset-0 flex items-center justify-center font-mono text-[9px] font-semibold text-ink-headline">
                              {d.usedPct}%
                            </div>
                          </div>
                        </div>
                        <span className="relative mt-2 inline-flex items-center gap-1 rounded-[8px] bg-accent-deep px-1.5 py-0.5 font-body text-[9px] font-medium text-accent-primary">
                          <TrendDownIcon />
                          {d.lessThanLastMonth} less than {prevMonthName}
                        </span>
                        <div className="relative my-2 h-px bg-border-subtle" />
                        <div className="relative flex items-stretch gap-3">
                          <div>
                            <div className="font-body text-[8px] uppercase tracking-wider text-ink-label">Safe to spend today</div>
                            <div className="mt-0.5 font-mono text-xs font-semibold text-ink-headline">{d.safeToSpendPerDay}</div>
                          </div>
                          <span className="w-px bg-border-subtle" />
                          <div>
                            <div className="font-body text-[8px] uppercase tracking-wider text-ink-label">Earned</div>
                            <div className="mt-0.5 font-mono text-xs font-semibold text-ink-headline">{d.earned}</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between px-0.5">
                        <span className="font-body text-[11px] font-semibold text-ink-headline">Recent transactions</span>
                        <span className="font-body text-[10px] font-medium text-accent-primary">See all ›</span>
                      </div>
                      <div className="mt-1 flex flex-col divide-y divide-border-subtle rounded-[12px] bg-surface">
                        {[tx, tx2, tx3].map((row) => (
                          <div key={row.merchant} className="flex items-center gap-2 px-2.5 py-1.5">
                            <CategoryIcon kind={row.kind} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-body text-[11px] font-semibold text-ink-headline">{row.merchant}</div>
                              <div className="truncate font-body text-[9px] text-ink-label">{row.category}</div>
                            </div>
                            <span className="shrink-0 font-mono text-[11px] font-semibold text-ink-headline">{row.amount}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-2 flex items-center justify-between px-0.5">
                        <span className="font-body text-[11px] font-semibold text-ink-headline">Categories</span>
                        <span className="font-body text-[10px] font-medium text-accent-primary">See all ›</span>
                      </div>
                      <div className="mt-1 flex flex-col gap-1.5">
                        {SAMPLE_CATEGORIES.slice(0, 2).map((cat) => (
                          <div key={cat.name} className="flex items-center gap-2 rounded-[12px] bg-surface px-2.5 py-1.5">
                            <CategoryIcon kind={cat.kind} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-body text-[11px] font-semibold text-ink-headline">{cat.name}</div>
                              <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-raised">
                                <div className="h-full rounded-full bg-accent-primary" style={{ width: `${cat.pct}%` }} />
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="font-mono text-[11px] font-semibold text-ink-headline">{cat.spent}</div>
                              <div className="font-body text-[8px] text-ink-label">of {cat.budget}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div ref={calloutsRef} className="motion-reduce:hidden">
                {STEPS.map((step) => {
                  const left = step.side === 'left';
                  const ink = (left ? step.x : FRAME_W - step.x) - CALLOUT_INK_PX;
                  const dir = left ? 'to left' : 'to right';
                  return (
                    <div
                      key={step.number}
                      data-callout
                      data-side={step.side}
                      className={`pointer-events-none absolute hidden h-[18px] items-center lg:flex ${left ? 'flex-row-reverse' : ''}`}
                      style={{ top: step.y - 9, ...(left ? { right: FRAME_W - step.x } : { left: step.x }) }}
                    >
                      <span className="h-1 w-1 shrink-0 rounded-full bg-ink-headline" />
                      <span
                        className="h-px shrink-0"
                        style={{
                          width: ink + CALLOUT_REACH_PX,
                          background: `linear-gradient(${dir}, var(--color-ink-headline) ${ink}px, var(--color-surface) ${ink}px)`,
                        }}
                      />
                      <span className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap ${left ? 'mr-2.5' : 'ml-2.5'}`}>
                        <span className="flex h-[19px] w-[19px] items-center justify-center rounded-full border border-surface/85 font-mono text-[9px] font-bold text-surface">
                          {step.number}
                        </span>
                        <span className="font-body text-[11px] font-medium text-surface">{step.caption}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div ref={captionsRef} className="mt-4 flex flex-col items-center lg:hidden motion-reduce:hidden">
              <span className="h-4 w-px bg-surface/70" />
              <div className="relative mt-2 h-[24px] w-[260px]">
                {STEPS.map((step) => (
                  <div key={step.number} data-pill className="absolute inset-0 flex items-center justify-center gap-2">
                    <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-surface/70 font-mono text-[9px] font-bold text-surface">
                      {step.number}
                    </span>
                    <span className="font-body text-[12px] font-medium text-surface/90">{step.caption}</span>
                  </div>
                ))}
              </div>
            </div>

            <ol className="mt-6 hidden w-[264px] flex-col gap-2 motion-reduce:flex">
              {STEPS.map((step) => (
                <li key={step.number} className="flex items-center gap-2 font-body text-xs font-medium text-ink-headline">
                  <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-border-subtle font-mono text-[9px] font-bold">
                    {step.number}
                  </span>
                  {step.caption}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
