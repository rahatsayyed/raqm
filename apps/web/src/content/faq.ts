export interface FaqItem {
  q: string;
  a: string;
}
export interface FaqGroup {
  id: string;
  label: string;
  items: FaqItem[];
}

export const FAQ_UPDATED = '2026-11-08';

export const FAQ_GROUPS: FaqGroup[] = [
  {
    id: 'about',
    label: 'About Raqm',
    items: [
      {
        q: 'What is Raqm?',
        a: 'Raqm is an on-device personal expense tracker for India. On Android it reads your bank SMS and turns them into categorised transactions, so you do not have to log anything by hand.',
      },
      {
        q: 'Is Raqm available to download?',
        a: 'Not yet. Raqm is pre-launch and not published on any store. Join the waitlist and we will tell you when it is ready.',
      },
      {
        q: 'Which phones does it support?',
        a: 'Android is the primary, full-featured platform. An iPhone version is in progress and is planned around manual entry, because iOS does not let apps read SMS.',
      },
      {
        q: 'Is Raqm a financial advisor?',
        a: 'No. Raqm is an expense tracker. It shows you clearly what already happened with your money and does not give financial advice or forecasts.',
      },
    ],
  },
  {
    id: 'sms',
    label: 'SMS and privacy',
    items: [
      {
        q: 'Does my data leave my phone?',
        a: 'Your SMS and transactions never leave your phone. Raqm has no account and no analytics, and no server receives your transactions. The one thing that does reach an outside service is the optional location map, which asks OpenStreetMap for map tiles and a place name using a transaction’s coordinates when you open it.',
      },
      {
        q: 'Do I need an account?',
        a: 'No. There is no sign-up and no login. The waitlist asks for an email address only so we can tell you when the app launches.',
      },
      {
        q: 'Why does Raqm need SMS permission?',
        a: 'On Android, reading your bank messages is how transactions get captured automatically. Without that permission you can still add transactions by hand.',
      },
      {
        q: 'Does anything ever get shared?',
        a: 'Not today. Budget Together, planned for later and not available yet, would share budget data between people on purpose and would be optional. AI insights are also planned, off by default and not available yet.',
      },
      {
        q: 'What does leave my phone?',
        a: 'Two things. If you join the waitlist on this website, your email address is stored. In the app, opening the location map card sends that transaction’s coordinates to OpenStreetMap. Your bank SMS and transactions are not uploaded.',
      },
    ],
  },
  {
    id: 'banks',
    label: 'Banks and parsing',
    items: [
      {
        q: 'Which banks are supported?',
        a: 'The parser understands SMS formats from 120+ Indian and international banks. If your bank is missed, you can add the transaction manually.',
      },
      {
        q: 'What if a transaction is wrong?',
        a: 'Edit it. Rename a merchant or change a category once and Raqm remembers the fix for that merchant. Later scans do not undo your edits.',
      },
      {
        q: 'Are transfers between my own accounts counted as spending?',
        a: 'No. A matching debit and credit between your own accounts within 24 hours is treated as a self-transfer and kept out of spending totals.',
      },
      {
        q: 'How are refunds handled?',
        a: 'A refund credit is linked to the original purchase and netted against that category, so your totals show what you actually kept.',
      },
    ],
  },
  {
    id: 'budgets',
    label: 'Budgets and data',
    items: [
      {
        q: 'Can I set budgets?',
        a: 'Yes. Raqm supports budgets and analytics, and you can choose which day your month starts on.',
      },
      {
        q: 'What happens when I delete a transaction?',
        a: 'Deletion is a soft delete. You can restore deleted transactions from the More tab.',
      },
      {
        q: 'Can I export my data?',
        a: 'Yes. You can export your transactions to CSV and a monthly PDF statement, which is also the way to keep a copy because Raqm holds no cloud backup of your data.',
      },
      {
        q: 'Can I import my old data?',
        a: 'Yes, from two sources today: an Axio CSV report and a Google Pay statement PDF. Bank statement PDFs and Pennywise are marked as coming soon and are not available yet.',
      },
      {
        q: 'What if I lose my phone?',
        a: 'Because data is stored only on the device, it goes with the phone unless you exported a copy. Export now and then if the history matters to you.',
      },
    ],
  },
];
