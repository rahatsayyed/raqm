const SHAPES = [
  <g key="0">
    <circle cx="320" cy="200" r="150" className="fill-brand-soft" />
    <circle cx="320" cy="200" r="100" className="fill-surface" />
    <circle cx="320" cy="200" r="52" className="fill-brand" />
    <rect x="60" y="90" width="120" height="18" rx="9" className="fill-inverse" />
    <rect x="60" y="124" width="84" height="18" rx="9" className="fill-surface" />
  </g>,
  <g key="1">
    {[0, 1, 2, 3, 4].map((i) => (
      <rect
        key={i}
        x={90 + i * 56}
        y={290 - [90, 150, 70, 190, 120][i]}
        width="38"
        height={[90, 150, 70, 190, 120][i]}
        rx="12"
        className={i === 3 ? 'fill-brand' : 'fill-surface'}
      />
    ))}
    <rect x="70" y="296" width="290" height="4" rx="2" className="fill-inverse" />
  </g>,
  <g key="2">
    <rect x="70" y="80" width="180" height="108" rx="20" className="fill-surface" />
    <rect x="150" y="160" width="190" height="108" rx="20" className="fill-inverse" />
    <path d="M130 134h60m-20-18 20 18-20 18" className="fill-none stroke-brand" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M300 214h-60m20-18-20 18 20 18" className="fill-none stroke-inverse-ink" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
  </g>,
  <g key="3">
    <rect x="130" y="44" width="140" height="236" rx="28" className="fill-inverse" />
    <rect x="142" y="60" width="116" height="204" rx="18" className="fill-surface" />
    <rect x="156" y="82" width="64" height="12" rx="6" className="fill-brand" />
    <rect x="156" y="108" width="88" height="40" rx="12" className="fill-brand-soft" />
    <rect x="156" y="160" width="88" height="14" rx="7" className="fill-surface-sunken" />
    <rect x="156" y="184" width="70" height="14" rx="7" className="fill-surface-sunken" />
    <circle cx="320" cy="90" r="34" className="fill-brand-soft" />
    <circle cx="90" cy="250" r="26" className="fill-surface" />
  </g>,
];

export function PostCover({ variant, className = '', fit = false }: { variant: number; className?: string; fit?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden bg-linear-to-br from-brand-soft via-surface-sunken to-canvas ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 400 320" preserveAspectRatio={fit ? 'xMidYMid meet' : 'xMidYMid slice'} className="absolute inset-0 size-full">
        {SHAPES[variant % SHAPES.length]}
      </svg>
    </div>
  );
}
