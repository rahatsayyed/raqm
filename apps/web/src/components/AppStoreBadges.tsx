import { scrollToHash } from './SmoothScrollProvider';

const SCAN_STEPS = [
  { number: 1, text: "Open your phone's camera app" },
  { number: 2, text: 'Point the camera at the QR code' },
  { number: 3, text: 'Tap the link that appears' },
];

function AppleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 384 512" className={className} fill="currentColor" aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-14.9 0-49.3-19.7-76-19.7C60.6 141 0 184.8 0 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-57.7-90-57.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function GooglePlayGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} fill="currentColor" aria-hidden="true">
      <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
    </svg>
  );
}

function StoreBadge({
  storeLabel,
  storeName,
  Icon,
  blurb,
}: {
  storeLabel: string;
  storeName: string;
  Icon: React.ComponentType<{ className?: string }>;
  blurb: string;
}) {
  return (
    <a
      href="#waitlist"
      onClick={(event) => {
        event.preventDefault();
        scrollToHash('#waitlist');
      }}
      className="group relative inline-flex focus-visible:outline-none"
    >
      <span className="inline-flex items-center gap-3 rounded-md bg-ink-headline px-5 py-3 text-surface transition-transform duration-150 active:scale-[0.98] group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-accent-primary">
        <Icon className="size-5 shrink-0" />
        <span className="flex flex-col items-start leading-tight">
          <span className="font-body text-[10px] text-[color-mix(in_srgb,var(--color-surface)_75%,transparent)]">
            {storeLabel}
          </span>
          <span className="font-body text-sm font-semibold">{storeName}</span>
        </span>
      </span>

      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 w-80 -translate-x-1/2 pb-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
        <div className="rounded-outer border border-border-subtle bg-surface p-2 text-left shadow-lg">
          <div className="flex items-start gap-4 bg-gray-100 rounded-sm p-1">
            <div className="flex-1 p-2">
              <Icon className="mb-2 size-4 shrink-0 text-ink-headline" />
              <p className="font-body text-sm text-ink-body">{blurb}</p>
            </div>
            <div className="flex size-28 shrink-0 items-center justify-center rounded-inner border-2 border-gray-50 bg-surface-raised font-body text-[10px] text-ink-label">
              QR code
            </div>
          </div>
          <ol className="flex flex-col px-3 mt-3">
            {SCAN_STEPS.map((step) => (
              <li
                key={step.number}
                className="flex items-end font-medium gap-2 border-t border-border-subtle py-2 font-body text-xs text-ink-body first:border-t-0 first:pt-0"
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border-subtle text-[10px] text-ink-label">
                  {step.number}
                </span>
                <span>{step.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </a>
  );
}

export function AppStoreBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <StoreBadge
        storeLabel="Download on the"
        storeName="App Store"
        Icon={AppleGlyph}
        blurb="Download Raqm and let it sort every rupee for you."
      />
      <StoreBadge
        storeLabel="Get it on"
        storeName="Google Play"
        Icon={GooglePlayGlyph}
        blurb="Download Raqm and let it sort every rupee for you."
      />
    </div>
  );
}
