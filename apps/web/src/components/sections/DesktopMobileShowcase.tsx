'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Scaled } from './showcase/Scaled';
import { DesktopDashboard, PhoneHome } from './showcase/screens';

gsap.registerPlugin(ScrollTrigger);

type Props = {
  desktopSrc?: string;
  mobileSrc?: string;
  desktopAlt?: string;
  mobileAlt?: string;
  eyebrow?: string;
  title?: string;
  body?: string;
};

const DW = 1000;
const DH = 620;
const MW = 280;
const MH = 600;

export function DesktopMobileShowcase({
  desktopSrc,
  mobileSrc,
  desktopAlt = 'Raqm dashboard on a large screen',
  mobileAlt = 'Raqm home screen on a phone',
  eyebrow = 'On-device by design',
  title = 'Your data stays on your phone.',
  body = 'Raqm reads your bank messages and sorts them right on your device. No bank login, no cloud account, just a calm view of what already happened.',
}: Props) {
  const root = useRef<HTMLElement>(null);
  const phone = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const st = { trigger: frame.current, start: 'top 80%', once: true };
        gsap.from(frame.current, { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: st });
        gsap.from(phone.current, { y: 70, x: 20, opacity: 0, duration: 1, delay: 0.25, ease: 'power3.out', scrollTrigger: st });
      });
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set([frame.current, phone.current], { opacity: 1, x: 0, y: 0 });
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <section ref={root} className="overflow-x-clip bg-canvas py-section lg:py-section-lg">
      <div className="mx-auto max-w-wide px-4 md:px-6">
        <div className="mx-auto mb-12 max-w-col text-center md:mb-16">
          <span className="inline-flex rounded-pill border border-line bg-surface px-3 py-1 text-[13px] text-ink-muted">{eyebrow}</span>
          <h2 className="mt-5 text-h2 text-ink">{title}</h2>
          <p className="mx-auto mt-4 max-w-[560px] text-lead text-ink-muted">{body}</p>
        </div>

        <div className="group relative mx-auto max-w-[1080px] pb-[14%] md:pb-[9%]">
          <div ref={frame} className="rounded-container bg-surface-sunken p-2 shadow-ring transition-transform duration-[650ms] ease-out group-hover:-translate-y-1.5 md:p-3">
            <div className="overflow-hidden rounded-cell border border-line bg-surface shadow-3">
              <div className="flex items-center gap-2 border-b border-line bg-surface-sunken px-4 py-2.5">
                <span className="size-2.5 rounded-pill bg-line" />
                <span className="size-2.5 rounded-pill bg-line" />
                <span className="size-2.5 rounded-pill bg-line" />
                <span className="mx-auto rounded-pill bg-surface px-10 py-0.5 text-[11px] text-ink-subtle shadow-ring">Raqm</span>
              </div>
              {desktopSrc ? (
                <div className="relative" style={{ aspectRatio: `${DW} / ${DH}` }}>
                  <Image src={desktopSrc} alt={desktopAlt} fill sizes="1080px" className="object-cover object-top-left" />
                </div>
              ) : (
                <div role="img" aria-label={desktopAlt}>
                  <Scaled w={DW} h={DH}><DesktopDashboard /></Scaled>
                </div>
              )}
            </div>
          </div>

          <div
            ref={phone}
            className="absolute bottom-0 right-[3%] w-[30%] max-w-[300px] transition-transform duration-[650ms] ease-out group-hover:-translate-y-3 md:right-[-1%] md:w-[27%]"
          >
            <div className="rounded-[2.2rem] bg-surface-sunken p-1.5 shadow-4 ring-1 ring-ring">
              <div className="overflow-hidden rounded-[1.8rem] border border-line bg-surface">
                {mobileSrc ? (
                  <div className="relative" style={{ aspectRatio: `${MW} / ${MH}` }}>
                    <Image src={mobileSrc} alt={mobileAlt} fill sizes="300px" className="object-cover object-top" />
                  </div>
                ) : (
                  <div role="img" aria-label={mobileAlt}>
                    <Scaled w={MW} h={MH}><PhoneHome /></Scaled>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-col text-center text-[13px] text-ink-subtle">Sample data shown. Numbers are illustrative.</p>
      </div>
    </section>
  );
}
