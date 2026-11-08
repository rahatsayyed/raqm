import type { ReactNode } from 'react';

export type CellValue = 'yes' | 'no' | 'limit' | string;
export type IconName = 'phone' | 'user' | 'bank' | 'wifi' | 'sms' | 'widget' | 'export' | 'chart' | 'transfer' | 'refund' | 'trash';

const ICONS: Record<IconName, string> = {
  phone: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0',
  bank: 'M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18',
  wifi: 'M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01',
  sms: 'M4 5h16v11H9l-5 4V5zM8 10h8',
  widget: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  export: 'M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14',
  chart: 'M5 20V10M12 20V4M19 20v-7',
  transfer: 'M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4',
  refund: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  trash: 'M5 7h14M10 4h4M7 7l1 13h8l1-13M10 11v5M14 11v5',
};

const GLYPH = 'size-4 shrink-0';

export function RowIcon({ name }: { name: IconName }) {
  return (
    <span aria-hidden="true" className="flex h-[1lh] shrink-0 items-center text-ink-subtle">
      <svg viewBox="0 0 24 24" className={GLYPH} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={ICONS[name]} />
      </svg>
    </span>
  );
}

function Mark({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="flex h-[1lh] shrink-0 items-center">
      {children}
    </span>
  );
}

function Check() {
  return (
    <Mark>
      <svg viewBox="0 0 24 24" className={GLYPH} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 12.5l4.5 4.5L19.5 7" />
      </svg>
    </Mark>
  );
}

function Dash() {
  return (
    <Mark>
      <svg viewBox="0 0 24 24" className={`${GLYPH} text-ink-subtle`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M6 12h12" />
      </svg>
    </Mark>
  );
}

const SHORT: Record<string, { full: string }> = {
  yes: { full: 'Yes' },
  no: { full: 'Not yet' },
  limit: { full: 'Varies by app' },
};

function Label({ value }: { value: string }): ReactNode {
  const known = SHORT[value];
  if (!known) return <span className="min-w-0 break-words">{value}</span>;
  return (
    <span className="min-w-0">{known.full}</span>
  );
}

export function RaqmValue({ value }: { value: CellValue }) {
  return (
    <span className="flex items-start gap-2.5">
      <Check />
      <Label value={value} />
    </span>
  );
}

export function OtherValue({ value }: { value: CellValue }) {
  const known = SHORT[value];
  return (
    <span className="flex items-start gap-2">
      {value === 'yes' ? <Check /> : known && <Dash />}
      <Label value={value} />
    </span>
  );
}
