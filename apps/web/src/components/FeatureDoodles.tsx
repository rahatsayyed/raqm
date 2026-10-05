'use client';

import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import gsap from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';

const INK = 'var(--color-accent-primary)';
const SPARK = 'var(--color-notice)';
const STROKE = {
  fill: 'none',
  strokeWidth: 3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  vectorEffect: 'non-scaling-stroke',
} as const;
const MORPH_SECONDS = 1.1;

gsap.registerPlugin(MorphSVGPlugin);

const SCENES: Array<{ paths: string[]; sparks: string[] }> = [
  // capture-organize: phone + SMS bubble flowing into a tidy list
  {
    paths: [
      'M96 60 Q94 52 104 50 L186 49 Q196 50 196 60 L198 262 Q197 272 187 272 L105 273 Q95 272 96 262 Z',
      'M128 62 Q146 66 164 62',
      'M114 98 Q112 92 120 91 L168 90 Q176 92 175 99 L174 118 Q173 124 166 124 L136 125 L124 136 L125 125 Q114 124 114 116 Z',
      'M124 150 Q150 148 176 151',
      'M124 172 Q144 171 164 173',
      'M214 150 Q252 132 288 150 M272 134 L292 152 L270 166',
      'M262 214 Q260 206 270 205 L300 204 L310 216 L360 215 Q370 216 369 226 L368 296 Q367 306 357 306 L272 307 Q262 306 263 296 Z',
      'M284 244 Q306 242 346 245 M284 268 Q310 266 332 269',
      'M130 322 Q200 338 270 322',
    ],
    sparks: ['M330 110 L330 134 M318 122 L342 122', 'M70 320 l14 -14 m0 14 l-14 -14'],
  },
  // split: bill cut in two, coins passing across
  {
    paths: [
      'M88 70 L312 69 L314 320 L292 306 L270 322 L248 306 L226 322 L204 306 L182 322 L160 306 L138 322 L112 306 L88 320 Z',
      'M118 110 Q170 106 222 111 M118 146 Q150 143 186 147 M118 182 Q166 179 206 183',
      'M200 70 Q196 130 204 190 Q210 250 200 322',
      'M240 226 a34 34 0 1 0 0.1 0',
      'M232 232 Q240 218 250 232 M240 218 L240 246',
      'M300 210 Q330 190 352 214 M340 198 L356 216 L334 224',
    ],
    sparks: ['M62 150 l12 -12 m0 12 l-12 -12', 'M340 86 Q352 76 356 90 Q352 102 340 98'],
  },
  // smarter-budgets: gauge with needle + coin stack
  {
    paths: [
      'M60 260 Q58 150 200 148 Q342 150 340 260',
      'M92 260 Q92 176 200 176 Q308 176 308 260',
      'M200 260 L262 196',
      'M186 262 a14 14 0 1 0 0.1 0',
      'M110 300 Q200 316 290 300',
      'M146 332 a28 12 0 1 0 0.1 0 M146 348 a28 12 0 1 0 0.1 0',
      'M254 330 a28 12 0 1 0 0.1 0 M254 346 a28 12 0 1 0 0.1 0 M254 362 a28 12 0 1 0 0.1 0',
    ],
    sparks: ['M200 100 L200 126 M176 108 L186 128 M224 108 L214 128', 'M330 120 Q344 110 350 126'],
  },
  // life-admin: calendar, bell, ticked chores
  {
    paths: [
      'M70 100 Q70 88 82 88 L238 87 Q250 88 250 100 L252 290 Q252 302 240 302 L82 303 Q70 302 70 290 Z',
      'M70 134 Q160 130 252 135',
      'M110 72 L110 102 M212 72 L212 102',
      'M96 168 l12 12 l22 -24 M156 170 Q186 168 222 171',
      'M96 218 l12 12 l22 -24 M156 220 Q180 218 222 221',
      'M96 266 Q108 254 122 266 M156 268 Q184 266 214 269',
      'M310 160 Q310 120 340 120 Q370 120 370 160 L376 200 L304 200 Z',
      'M326 216 Q340 232 356 216',
    ],
    sparks: ['M282 108 l10 -10 m0 10 l-10 -10', 'M384 118 Q394 104 388 94'],
  },
  // budget-together: two people sharing a wallet
  {
    paths: [
      'M120 120 a30 30 0 1 0 0.1 0',
      'M64 250 Q66 190 120 188 Q174 190 176 250',
      'M280 120 a30 30 0 1 0 0.1 0',
      'M224 250 Q226 190 280 188 Q334 190 336 250',
      'M150 292 Q150 278 164 278 L240 277 Q252 278 252 292 L253 340 Q252 354 240 354 L164 355 Q150 354 150 340 Z',
      'M252 308 Q280 306 284 316 Q284 328 252 330',
      'M200 62 Q180 40 164 54 Q154 70 200 100 Q246 70 236 54 Q220 40 200 62',
    ],
    sparks: ['M92 300 l12 -12 m0 12 l-12 -12', 'M320 300 Q332 288 342 302'],
  },
  // ai-insights: on-device chip with sparkles and a lock
  {
    paths: [
      'M120 120 Q120 108 132 108 L268 107 Q280 108 280 120 L281 256 Q280 268 268 268 L132 269 Q120 268 120 256 Z',
      'M160 150 Q160 146 166 146 L234 145 Q240 146 240 152 L241 224 Q240 230 234 230 L166 231 Q160 230 160 224 Z',
      'M150 108 L150 84 M200 108 L200 80 M250 108 L250 84',
      'M150 268 L150 292 M200 268 L200 296 M250 268 L250 292',
      'M120 156 L96 156 M120 200 L92 200 M120 236 L96 236',
      'M280 156 L304 156 M280 200 L308 200 M280 236 L304 236',
      'M190 192 Q190 176 200 176 Q210 176 210 192 M184 192 L216 192 L216 214 L184 214 Z',
    ],
    sparks: ['M330 90 L330 122 M314 106 L346 106', 'M70 90 L70 108 M61 99 L79 99', 'M330 320 Q344 308 352 324'],
  },
];

export function FeatureDoodles({
  activeIndex,
  rowRefs,
}: {
  activeIndex: number;
  rowRefs: RefObject<Array<HTMLLIElement | null>>;
}): ReactNode {
  const layerRef = useRef<HTMLDivElement>(null);
  const inkRef = useRef<SVGPathElement>(null);
  const sparkRef = useRef<SVGPathElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    const ink = inkRef.current;
    const spark = sparkRef.current;
    if (!ink || !spark) return;
    const scene = SCENES[activeIndex];
    const inkD = scene.paths.join(' ');
    const sparkD = scene.sparks.join(' ');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!mountedRef.current || reduceMotion) {
      mountedRef.current = true;
      gsap.set(ink, { attr: { d: inkD } });
      gsap.set(spark, { attr: { d: sparkD } });
      return;
    }
    const vars = { duration: MORPH_SECONDS, ease: 'power2.inOut', overwrite: 'auto' } as const;
    gsap.to(ink, { ...vars, morphSVG: { shape: inkD, shapeIndex: 'auto', map: 'complexity' } });
    gsap.to(spark, { ...vars, morphSVG: { shape: sparkD, shapeIndex: 'auto', map: 'complexity' } });
  }, [activeIndex]);

  useEffect(() => {
    const ink = inkRef.current;
    const spark = sparkRef.current;
    return () => {
      if (ink) gsap.killTweensOf(ink);
      if (spark) gsap.killTweensOf(spark);
    };
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    const list = layer?.parentElement;
    if (!layer || !list) return;
    // Layer spans first-row center to last-row center so the sticky doodle enters and leaves with those cards.
    const measure = () => {
      const first = rowRefs.current[0];
      const last = rowRefs.current[rowRefs.current.length - 1];
      if (!first || !last) return;
      layer.style.top = `${first.offsetTop + first.offsetHeight / 2}px`;
      layer.style.bottom = `${list.offsetHeight - (last.offsetTop + last.offsetHeight / 2)}px`;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    rowRefs.current.forEach((row) => row && observer.observe(row));
    return () => observer.disconnect();
  }, [rowRefs]);

  return (
    <div ref={layerRef} aria-hidden className="pointer-events-none absolute inset-x-0 z-0">
      <div className="sticky top-[54svh] h-0 lg:top-[50svh]">
        <svg
          viewBox="0 0 400 400"
          className="absolute right-0 top-0 aspect-square w-[min(62vw,250px)] -translate-y-1/2 -right-3 overflow-visible opacity-[0.18] sm:right-0 sm:w-[min(48vw,340px)] sm:opacity-[0.18] lg:w-[min(30vw,420px)] lg:opacity-[0.3] xl:-right-24"
        >
          <path ref={inkRef} d={SCENES[0].paths.join(' ')} {...STROKE} stroke={INK} />
          <path ref={sparkRef} d={SCENES[0].sparks.join(' ')} {...STROKE} stroke={SPARK} />
        </svg>
      </div>
    </div>
  );
}
