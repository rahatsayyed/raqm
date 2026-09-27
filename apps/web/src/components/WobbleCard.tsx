'use client';

import { useState } from 'react';

export function WobbleCard({
  children,
  containerClassName = '',
  className = '',
  noise = true,
}: {
  children: React.ReactNode;
  containerClassName?: string;
  className?: string;
  noise?: boolean;
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPos({
      x: (event.clientX - (rect.left + rect.width / 2)) / 20,
      y: (event.clientY - (rect.top + rect.height / 2)) / 20,
    });
  };

  return (
    <article
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false);
        setPos({ x: 0, y: 0 });
      }}
      style={{
        transform: hovering ? `translate3d(${pos.x}px, ${pos.y}px, 0)` : 'translate3d(0px, 0px, 0)',
        transition: 'transform 0.1s ease-out',
      }}
      className={`group relative overflow-hidden rounded-outer shadow-[0_20px_45px_-24px_rgba(20,20,15,0.35)] motion-reduce:!transform-none ${containerClassName}`}
    >
      <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(88%_100%_at_top,rgba(255,255,255,0.35),rgba(255,255,255,0))]" />
      <div
        style={{
          transform: hovering ? `translate3d(${-pos.x}px, ${-pos.y}px, 0) scale3d(1.025, 1.025, 1)` : 'translate3d(0px, 0px, 0) scale3d(1, 1, 1)',
          transition: 'transform 0.1s ease-out',
        }}
        className={`relative h-full motion-reduce:!transform-none ${className}`}
      >
        {noise && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full scale-[1.2] opacity-10 [mask-image:radial-gradient(#fff,transparent_75%)]"
            style={{ backgroundImage: 'url(/noise.webp)', backgroundSize: '30%' }}
          />
        )}
        {children}
      </div>
    </article>
  );
}
