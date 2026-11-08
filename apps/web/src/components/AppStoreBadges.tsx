import { StoreBadge, type StoreId } from './content/StoreBadge';

const SCAN_STEPS = [
  { number: 1, text: "Open your phone's camera app" },
  { number: 2, text: 'Point the camera at the QR code' },
  { number: 3, text: 'Tap the link that appears' },
];

const BLURB = 'Download Raqm and let it sort every rupee for you.';

function BadgeWithQr({ store }: { store: StoreId }) {
  return (
    <div className="group relative inline-flex">
      <StoreBadge store={store} />

      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 w-80 -translate-x-1/2 pb-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        <div className="rounded-container border border-line bg-surface p-2 text-left shadow-3">
          <div className="flex items-start gap-4 rounded-cell bg-surface-sunken p-1">
            <div className="flex-1 p-2">
              <p className="text-sm text-ink-muted">{BLURB}</p>
            </div>
            <div className="flex size-28 shrink-0 items-center justify-center rounded-chip border border-line bg-surface text-[10px] text-ink-subtle">
              QR code
            </div>
          </div>
          <ol className="mt-3 flex flex-col px-3">
            {SCAN_STEPS.map((step) => (
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

export function AppStoreBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      <BadgeWithQr store="android" />
      <BadgeWithQr store="ios" />
    </div>
  );
}
