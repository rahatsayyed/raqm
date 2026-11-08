const PATHS: Record<string, string[]> = {
  'capture-organize': ['M4 5h16v11H9l-5 4z', 'M8 9.5h8M8 12.5h5'],
  'smarter-budgets': ['M12 3v9h9', 'M12 3a9 9 0 1 0 9 9'],
  split: ['M6 3h12v18l-3-2-3 2-3-2-3 2z', 'M9 8h6', 'M9 12h6'],
  insights: ['M4 20h16', 'M6.5 20v-5', 'M11 20v-9', 'M15.5 20V7', 'M20 20V4'],
  'smart-matching': ['M7 7h11l-3-3', 'M17 17H6l3 3'],
  widgets: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  'private-by-design': ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', 'M9 12l2 2 4-4'],
  export: ['M12 3v12', 'M7 10l5 5 5-5', 'M4 20h16'],
  'life-admin': ['M5 4h14v16H5z', 'M9 9h6', 'M9 13h6', 'M9 17h3'],
  'budget-together': ['M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M16 11a3 3 0 1 0 0-6', 'M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6', 'M17 14c2.2.4 4 2.3 4 6'],
  'ai-insights': ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z'],
};

export function FeatureIcon({ slug, className = 'size-[18px]' }: { slug: string; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {(PATHS[slug] ?? PATHS.insights).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
