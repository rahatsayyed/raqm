import type { ToolSlug } from '@/lib/calculators/tools';

const PATHS: Record<ToolSlug, string[]> = {
  emi: ['M3 11.5 12 4l9 7.5', 'M5.5 10v10h13V10', 'M10 20v-5h4v5'],
  sip: ['M3 17l6-6 4 4 8-8', 'M15 7h6v6'],
  'compound-interest': ['M4 20h16', 'M6.5 20v-5', 'M11 20v-9', 'M15.5 20V7', 'M20 20V4'],
  'split-bill': ['M6 3h12v18l-3-2-3 2-3-2-3 2z', 'M9 8h6', 'M9 12h6'],
  'emergency-fund': ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', 'M9 12l2 2 4-4'],
  'budget-50-30-20': ['M12 3v9h9', 'M12 3a9 9 0 1 0 9 9'],
};

export function ToolIcon({ slug, className = 'size-[18px]' }: { slug: ToolSlug; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {PATHS[slug].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
