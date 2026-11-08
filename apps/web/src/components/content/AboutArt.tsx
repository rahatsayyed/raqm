export function AboutArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 221" className={className} role="img" aria-label="A phone holding a bank message, with a lock on it">
      <ellipse cx="130" cy="206" rx="86" ry="9" className="fill-surface-sunken" />
      <rect x="82" y="14" width="96" height="184" rx="20" className="fill-inverse" />
      <rect x="90" y="26" width="80" height="160" rx="12" className="fill-surface" />
      <rect x="116" y="19" width="28" height="4" rx="2" className="fill-inverse-line" />
      <rect x="98" y="38" width="64" height="26" rx="9" className="fill-brand-soft" />
      <rect x="104" y="46" width="34" height="4" rx="2" className="fill-brand" />
      <rect x="104" y="54" width="22" height="4" rx="2" className="fill-ink-subtle" />
      <rect x="98" y="72" width="64" height="22" rx="9" className="fill-surface-sunken" />
      <rect x="104" y="81" width="40" height="4" rx="2" className="fill-ink-subtle" />
      <path d="M98 120h64" className="stroke-line" strokeWidth="1" />
      <rect x="98" y="132" width="26" height="44" rx="6" className="fill-brand" />
      <rect x="128" y="146" width="14" height="30" rx="6" className="fill-brand-soft" />
      <rect x="146" y="138" width="14" height="38" rx="6" className="fill-surface-sunken" />
      <g>
        <circle cx="190" cy="150" r="30" className="fill-brand" />
        <rect x="177" y="148" width="26" height="20" rx="5" className="fill-brand-ink" />
        <path d="M182 148v-5a8 8 0 0 1 16 0v5" className="fill-none stroke-brand-ink" strokeWidth="4" strokeLinecap="round" />
        <circle cx="190" cy="158" r="3" className="fill-brand" />
      </g>
      <path d="M30 70c18-14 36-14 44 0" className="fill-none stroke-ink-subtle" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 7" />
      <rect x="20" y="78" width="44" height="28" rx="9" className="fill-surface" />
      <path d="M32 90h20M32 97h12" className="stroke-ink-subtle" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
