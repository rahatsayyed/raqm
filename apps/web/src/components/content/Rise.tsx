'use client';

import { useEffect, useRef } from 'react';

export function Rise({
  children,
  className = '',
  index = 0,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  index?: number;
  as?: 'div' | 'section' | 'li' | 'header';
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      el.classList.add('is-revealed');
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-revealed');
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={`reveal ${className}`}
      style={{ '--i': index } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
