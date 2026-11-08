'use client';

import { useLayoutEffect, useRef, useState } from 'react';

export function Scaled({ w, h, children, className = '' }: { w: number; h: number; children: React.ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / w);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w]);

  return (
    <div ref={box} className={`relative w-full overflow-hidden ${className}`} style={{ aspectRatio: `${w} / ${h}` }}>
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: w, height: h, transform: `scale(${scale})`, visibility: scale ? 'visible' : 'hidden' }}
      >
        {children}
      </div>
    </div>
  );
}
