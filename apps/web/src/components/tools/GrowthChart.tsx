'use client';

import { useState } from 'react';
import { formatCompact, formatRupees } from '@/lib/calculators/money';

type Point = { year: number; invested: number; balance: number };

const W = 640;
const H = 260;
const PAD = { t: 16, r: 16, b: 32, l: 56 };

export function GrowthChart({ rows, start = 0 }: { rows: Point[]; start?: number }) {
  const [active, setActive] = useState<number | null>(null);
  const pts: Point[] = [{ year: 0, invested: start, balance: start }, ...rows];
  const maxY = Math.max(...pts.map((p) => p.balance), 1);
  const maxX = pts[pts.length - 1].year || 1;
  const x = (yr: number) => PAD.l + (yr / maxX) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / maxY) * (H - PAD.t - PAD.b);
  const line = (key: 'invested' | 'balance') => pts.map((p) => `${x(p.year).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
  const area = `${line('balance')} ${x(maxX).toFixed(1)},${y(0)} ${x(0).toFixed(1)},${y(0)}`;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const labelEvery = Math.max(1, Math.ceil(pts.length / 6));
  const cur = active === null ? pts[pts.length - 1] : pts[active];

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    const yr = ((vx - PAD.l) / (W - PAD.l - PAD.r)) * maxX;
    setActive(Math.min(pts.length - 1, Math.max(0, Math.round((yr / maxX) * (pts.length - 1)))));
  };

  return (
    <figure>
      <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        <span className="font-semibold text-ink">{cur.year === 0 ? 'Start' : `After ${cur.year} ${cur.year === 1 ? 'year' : 'years'}`}</span>
        <span className="flex flex-wrap gap-x-4 font-mono text-[13px]">
          <span className="text-ink-muted">Invested {formatRupees(cur.invested)}</span>
          <span className="text-brand">Value {formatRupees(cur.balance)}</span>
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-pan-y select-none"
        role="img"
        aria-label={`Growth over ${maxX} years, from ${formatCompact(start)} to ${formatCompact(pts[pts.length - 1].balance)}`}
        onPointerMove={onMove}
        onPointerLeave={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(maxY * t)} y2={y(maxY * t)} className="stroke-line" strokeWidth="1" />
            <text x={PAD.l - 8} y={y(maxY * t) + 4} textAnchor="end" className="fill-ink-subtle font-mono" fontSize="11">
              {formatCompact(maxY * t)}
            </text>
          </g>
        ))}
        {pts.map((p, i) =>
          i % labelEvery === 0 || i === pts.length - 1 ? (
            <text key={p.year} x={x(p.year)} y={H - 10} textAnchor="middle" className="fill-ink-subtle font-mono" fontSize="11">
              {p.year === 0 ? '0' : `${p.year}y`}
            </text>
          ) : null,
        )}
        <polygon points={area} className="fill-brand/10" />
        <polyline points={line('invested')} fill="none" className="stroke-ink-subtle" strokeWidth="2" strokeDasharray="4 4" strokeLinejoin="round" />
        <polyline points={line('balance')} fill="none" className="stroke-brand" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {active !== null && (
          <g>
            <line x1={x(cur.year)} x2={x(cur.year)} y1={PAD.t} y2={H - PAD.b} className="stroke-ink-subtle" strokeWidth="1" />
            <circle cx={x(cur.year)} cy={y(cur.invested)} r="4" className="fill-surface stroke-ink-subtle" strokeWidth="2" />
            <circle cx={x(cur.year)} cy={y(cur.balance)} r="5" className="fill-brand stroke-surface" strokeWidth="2" />
          </g>
        )}
      </svg>
    </figure>
  );
}
