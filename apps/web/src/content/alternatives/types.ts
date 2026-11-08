import type { ComparisonRow } from '@/components/sections/ComparisonCard';

export type AltMark = 'yes' | 'no' | 'unknown' | (string & {});

export interface AltRow {
  feature: string;
  icon: ComparisonRow['icon'];
  raqm: 'yes' | 'no' | (string & {});
  other: AltMark;
  source?: string;
}

export interface Alternative {
  slug: string;
  name: string;
  nameNote?: string;
  seoTitle: string;
  seoDescription: string;
  h1: string;
  lede: string;
  verifiedOn: string;
  rows: AltRow[];
  faq: { q: string; a: string }[];
  sources: { label: string; url: string }[];
}
