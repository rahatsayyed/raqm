export type FaqItem = { q: string; a: string };
export type FaqCategory = { id: string; label: string; items: FaqItem[] };

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'privacy',
    label: 'Privacy',
    items: [
      {
        q: 'Where does my data live?',
        a: 'On your phone. Raqm stores and processes your transactions on the device itself, and there is no general cloud sync.',
      },
      {
        q: 'Does Raqm read my messages and send them somewhere?',
        a: 'On Android, Raqm reads bank SMS on the device to find transactions. That processing happens on your phone, not on a server.',
      },
      {
        q: 'Is anything ever shared with other people?',
        a: 'Only when you choose a feature that needs it. Budget Together shares budget data across devices on purpose. Split stays on-device and never uses a server.',
      },
    ],
  },
  {
    id: 'capture',
    label: 'Capture',
    items: [
      {
        q: 'How do transactions get into Raqm?',
        a: 'On Android they are picked up automatically from bank SMS, with no data entry. On iOS you add them by hand or import a PDF statement.',
      },
      {
        q: 'Why is iOS different from Android?',
        a: 'iOS does not let apps read SMS, so a background pipeline is not possible there. iOS support is still in progress.',
      },
      {
        q: 'What if Raqm gets a category wrong?',
        a: 'You can edit any transaction. Your edits and deletions are kept, and later scans do not overwrite them.',
      },
      {
        q: 'Can I undo a delete?',
        a: 'Yes. Deleting is always soft, and you can restore a transaction from the deleted list.',
      },
    ],
  },
  {
    id: 'product',
    label: 'The app',
    items: [
      {
        q: 'Is Raqm a financial advisor?',
        a: 'No. Raqm is an expense tracker. It shows you clearly what already happened, in a calm way, and does not give forecasts or advice.',
      },
      {
        q: 'What can it do today?',
        a: 'Automatic categorization, budgets, analytics, detection of self-transfers and refunds, export, and Split for sharing bills with friends.',
      },
      {
        q: 'Is it only for India?',
        a: 'Raqm is built for the Indian market first, including how Indian banks word their SMS.',
      },
    ],
  },
  {
    id: 'launch',
    label: 'Launch',
    items: [
      {
        q: 'Can I download it now?',
        a: 'Not yet. Raqm is not published anywhere, so the waitlist is the only way in for now.',
      },
      {
        q: 'What happens when I join the waitlist?',
        a: 'You give an email address, nothing else. We email you once Raqm is ready to install.',
      },
      {
        q: 'Will it be free?',
        a: 'The promise on this site is everything you need, free. We have not announced anything beyond that.',
      },
    ],
  },
];
