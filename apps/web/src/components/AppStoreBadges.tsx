import { AppleGlyph, PlayGlyph, StoreBadge, type StoreId } from './content/StoreBadge';

const WAITLIST_STEPS = [
  { number: 1, text: 'Add your email' },
  { number: 2, text: 'We tell you when it is ready' },
  { number: 3, text: 'No account needed' },
];

const BLURB: Record<StoreId, string> = {
  android: 'Raqm for Android is coming soon. Join the waitlist and we will tell you when it is on Google Play.',
  ios: 'Raqm for iPhone is in progress. Join the waitlist and we will tell you when it is on the App Store.',
};

type Align = 'center' | 'start';
type Placement = 'top' | 'bottom';

function BadgeWithQr({ store, align, placement }: { store: StoreId; align: Align; placement: Placement }) {
  const anchor = align === 'center' ? 'left-1/2 w-80 max-w-[calc(100vw-2rem)] -translate-x-1/2' : 'left-0 w-[min(20rem,100%)]';
  const side = placement === 'top' ? 'bottom-full pb-3' : 'top-full pt-3';
  return (
    <div className={`group inline-flex ${align === 'center' ? 'relative' : ''}`}>
      <StoreBadge store={store} />

      <div className={`pointer-events-none absolute z-10 ${anchor} ${side} opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100`}>
        <div className="rounded-container border border-line bg-surface p-2 text-left shadow-3">
          <div className="flex items-start gap-4 rounded-cell bg-surface-sunken p-1">
            <div className="flex-1 p-2">
              {store === 'android' ? (
                <PlayGlyph className="mb-2 size-4 shrink-0 text-ink" />
              ) : (
                <AppleGlyph className="mb-2 size-4 shrink-0 text-ink" />
              )}
              <p className="text-sm text-ink-muted">{BLURB[store]}</p>
            </div>
            <div className="flex size-28 shrink-0 items-center justify-center rounded-chip border border-line bg-surface text-[10px] text-ink-subtle">
              <svg aria-hidden viewBox="0 0 24 24" className="size-8 text-ink-subtle" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16v12H4zM4 7l8 6 8-6" />
              </svg>
            </div>
          </div>
          <ol className="mt-3 flex flex-col px-3">
            {WAITLIST_STEPS.map((step) => (
              <li
                key={step.number}
                className="flex items-end gap-2 border-t border-line py-2 text-xs font-medium text-ink-muted first:border-t-0 first:pt-0"
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-pill border border-line text-[10px] text-ink-subtle">
                  {step.number}
                </span>
                <span>{step.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

export function StoreBadgesWithQr({
  className = '',
  align = 'center',
  placement = 'top',
}: {
  className?: string;
  align?: Align;
  placement?: Placement;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2.5 ${align === 'center' ? 'justify-center' : 'relative'} ${className}`}
    >
      <BadgeWithQr store="android" align={align} placement={placement} />
      <BadgeWithQr store="ios" align={align} placement={placement} />
    </div>
  );
}

export function AppStoreBadges() {
  return <StoreBadgesWithQr />;
}
