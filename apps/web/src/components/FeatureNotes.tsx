'use client';

// Positions are relative to the feature row (its py padding is the free strip above/below the text).
const SLOTS: Array<{ className: string; rot: number }> = [
  { className: 'left-[2%] top-1.5 sm:top-2', rot: -4 },
  { className: 'left-[52%] top-2 sm:left-[36%] sm:top-3', rot: 3 },
  { className: 'left-[70%] top-1 hidden sm:block', rot: -3 },
  { className: 'left-[30%] top-9 sm:left-[24%] sm:top-12', rot: 4 },
  { className: 'left-[44%] bottom-9 sm:left-[38%] sm:bottom-12', rot: -3 },
  { className: 'left-[4%] bottom-2 sm:bottom-3', rot: 3 },
  { className: 'left-[50%] bottom-1.5 sm:left-[46%] sm:bottom-2', rot: -4 },
  { className: 'left-[76%] bottom-3 hidden sm:block', rot: 4 },
];

// Slot order matches SLOTS; indexes 2 and 7 (desktop-only) can be longer.
const NOTES: string[][] = [
  ['120+ banks', 'sms → parsed on-device', 'cash? 3 taps', 'amazon mktp → Amazon', 'refund netted', 'pdf statements too', 'split ₹500 = 300 + 200', 'nothing leaves your phone'],
  ['circles', 'equal / custom / one pays', 'upi link → 1 tap', 'flatmates, trip, crew', 'who owes what?', 'paid back? it notices', '₹ 0 left to chase', 'confirm in one tap'],
  ['paid on the 5th?', 'budget follows your payday', 'safe to spend', 'before you overspend', 'rollover?', 'per-category limits', 'day 18 of 30', 'bills due → heads-up'],
  ['rent due 1st', 'who owes me ₹?', 'grocery list', 'notes + places', 'lent / borrowed', 'reminders that stick', 'the small stuff', 'adds up'],
  ['you + spouse', 'one shared budget', 'flatmates ok', 'not your whole financial life', 'his / hers / ours', 'you pick what to share', 'private stays private', 'one wallet, two people'],
  ['auto-categorize', 'gets smarter over time', 'on-device', 'a second opinion before you buy', 'no cloud?', 'insights, not ads', 'your data stays yours', 'ask anything'],
];

export function FeatureNotes({ index, active }: { index: number; active: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {NOTES[index].map((text, i) => {
        const slot = SLOTS[i];
        return (
          <span
            key={text}
            className={`absolute whitespace-nowrap font-[family-name:var(--font-caveat)] text-[17px] leading-none text-ink-label sm:text-xl lg:text-2xl ${slot.className}`}
            style={{
              opacity: active ? 0.6 : 0,
              transform: `rotate(${slot.rot}deg)`,
              clipPath: active ? 'inset(-4px -4px -4px -4px)' : 'inset(-4px 100% -4px -4px)',
              transition: active
                ? `clip-path 700ms cubic-bezier(0.4,0,0.2,1) ${250 + i * 110}ms, opacity 300ms ease ${250 + i * 110}ms`
                : 'opacity 250ms ease, clip-path 0ms linear 250ms',
            }}
          >
            {text}
          </span>
        );
      })}
    </div>
  );
}
