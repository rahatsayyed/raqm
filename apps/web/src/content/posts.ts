export type Block =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'callout'; label: string; text: string }
  | { type: 'cta' };

export interface Post {
  slug: string;
  title: string;
  description: string;
  quickAnswer: string;
  tag: string;
  publishedAt: string;
  updatedAt: string;
  cover: 0 | 1 | 2 | 3;
  body: Block[];
  faq: { q: string; a: string }[];
}

export const POSTS: Post[] = [
  {
    slug: 'why-your-bank-sms-should-stay-on-your-phone',
    title: 'Why your bank SMS should stay on your phone',
    description:
      'Your bank texts hold a full diary of your spending. Here is why Raqm reads them on your phone and never sends them anywhere.',
    quickAnswer:
      'Bank SMS contain amounts, merchants, account endings and balances. Raqm parses them on your device, keeps the result in a local database, and has no server that receives your transactions.',
    tag: 'Privacy',
    publishedAt: '2026-11-03',
    updatedAt: '2026-11-08',
    cover: 0,
    body: [
      {
        type: 'p',
        text: 'Every time you pay with a card or UPI, your bank sends a text. Put those texts side by side and you have a detailed diary: where you shop, when you travel, what you pay every month, how much is left in the account.',
      },
      {
        type: 'p',
        text: 'That is exactly why an expense tracker that reads them should be careful. **The question is not whether the app can read your SMS. It is where the reading happens.**',
      },
      { type: 'h2', text: 'What is actually inside a bank SMS' },
      {
        type: 'p',
        text: 'A typical alert carries the amount, the merchant or UPI handle, the last digits of your account, and often the balance after the payment. None of that is a password, but together it describes your life in rupees.',
      },
      {
        type: 'ul',
        items: [
          '**Amount and date.** What you spent and when.',
          '**Merchant or payee.** Which shop, app or person received it.',
          '**Account ending and balance.** Which account, and often how much remains.',
        ],
      },
      { type: 'h2', text: 'The usual way: link your bank' },
      {
        type: 'p',
        text: 'Many finance apps ask you to link a bank account or upload your messages so a server can process them. That can work well, but it means a company holds a copy of your financial activity, and you are trusting its security and its policies for as long as it exists.',
      },
      { type: 'h2', text: 'How Raqm does it instead' },
      {
        type: 'p',
        text: 'On Android, Raqm reads the SMS already sitting on your phone. A parser built for 120+ bank formats pulls out the amount, merchant and account, the app sorts the transaction into a category, and the result is saved in a database on the device.',
      },
      {
        type: 'ol',
        items: [
          '**Read.** The SMS is read locally, with your permission.',
          '**Parse.** The text is turned into a structured transaction on the phone.',
          '**Store.** The transaction is saved in local storage. There is no Raqm server in this path.',
        ],
      },
      {
        type: 'callout',
        label: 'The one exception',
        text: 'Budget together is a feature that shares budget data between people, so it is the one place where data is deliberately shared. It is a separate, opt-in feature and does not change how SMS are handled.',
      },
      { type: 'h2', text: 'What on-device does not mean' },
      {
        type: 'p',
        text: 'On-device is not magic. If you lose your phone without a backup, local data goes with it, and Raqm cannot recover it for you because it never had a copy. That is the trade: you hold the data, so you hold the responsibility. Export to CSV is there so you can keep your own copy.',
      },
      { type: 'cta' },
      { type: 'h2', text: 'A simple test for any finance app' },
      {
        type: 'p',
        text: 'Before you give an app access to your messages, ask three things: where is my data processed, who can see it, and what happens to it if I delete the app. If the answers are not clear and short, think twice.',
      },
    ],
    faq: [
      {
        q: 'Does Raqm upload my SMS?',
        a: 'No. Raqm parses SMS on your phone and stores the transactions in a local database. There is no server that receives your messages.',
      },
      {
        q: 'Which messages does Raqm look at?',
        a: 'It reads bank transaction messages so it can turn them into transactions. Messages it cannot recognise as bank alerts are not turned into transactions.',
      },
      {
        q: 'What happens to my data if I uninstall?',
        a: 'Data lives on your device, so uninstalling removes it. Export a CSV first if you want to keep a copy.',
      },
    ],
  },
  {
    slug: 'track-expenses-from-bank-sms-in-india',
    title: 'How to track expenses from bank SMS in India',
    description:
      'A practical guide to turning the bank alerts you already receive into a clear picture of your spending, without typing anything in.',
    quickAnswer:
      'Indian banks text you for most debits and credits. A tracker that reads those texts can build your expense history automatically. Raqm does this on Android, on-device, and lets you fix any mistake once.',
    tag: 'Guides',
    publishedAt: '2026-11-04',
    updatedAt: '2026-11-08',
    cover: 1,
    body: [
      {
        type: 'p',
        text: 'Most people in India already have a record of their spending. It is sitting in the messages app, one alert at a time. The hard part is that nobody wants to scroll through hundreds of texts to add them up.',
      },
      { type: 'h2', text: 'Why manual tracking fails' },
      {
        type: 'p',
        text: 'Manual logging works for a week or two. Then a busy day happens, three payments go unrecorded, and the picture is wrong, so the whole habit quietly stops. **Tracking that depends on remembering will always lose to real life.**',
      },
      { type: 'h2', text: 'What a good SMS-based tracker does' },
      {
        type: 'ul',
        items: [
          '**Reads past messages.** You choose a date range and it builds your history from what is already there.',
          '**Catches new ones live.** New alerts become transactions as they arrive.',
          '**Understands many banks.** Formats differ, so the parser must handle debit cards, credit cards, UPI and more.',
          '**Lets you correct things.** A wrong merchant or category should take one fix, not a recurring chore.',
        ],
      },
      { type: 'h2', text: 'Setting it up with Raqm' },
      {
        type: 'ol',
        items: [
          '**Install and allow SMS access.** On Android, Raqm needs permission to read messages to do its job.',
          '**Run the first scan.** Pick how far back to look. Raqm turns matching alerts into transactions.',
          '**Review a few.** Rename a merchant or change a category once. Raqm remembers the fix for that merchant.',
          '**Leave it running.** From then on, new bank alerts show up on their own.',
        ],
      },
      {
        type: 'callout',
        label: 'Good to know',
        text: 'Scans only add what is missing. If you edit or delete a transaction, a later scan does not bring the old version back.',
      },
      { type: 'h2', text: 'What about accounts that do not send SMS?' },
      {
        type: 'p',
        text: 'Some accounts never text you, and cash leaves no message at all. For those you can add an entry by hand, or import a PDF statement. On iPhone, where apps cannot read SMS, manual entry and PDF import are how tracking works.',
      },
      { type: 'cta' },
      { type: 'h2', text: 'Reading the result' },
      {
        type: 'p',
        text: 'Once the history is in, the useful part begins: how much went to food this month, which subscriptions repeat, whether a budget is holding. The point is a calm look at what already happened, not a lecture about it.',
      },
    ],
    faq: [
      {
        q: 'Do I need to link my bank account?',
        a: 'No. Raqm works from the SMS on your phone and does not ask for bank login details.',
      },
      {
        q: 'Which banks work?',
        a: 'The parser handles 120+ Indian and international bank SMS formats. If one is missed, you can still add the transaction by hand.',
      },
      {
        q: 'Does it work on iPhone?',
        a: 'iOS does not allow apps to read SMS, so on iPhone Raqm is built around manual entry and PDF statement import. It is still in progress.',
      },
    ],
  },
  {
    slug: 'self-transfers-refunds-and-your-real-spending',
    title: 'Self-transfers, refunds and your real spending',
    description:
      'Moving money between your own accounts is not spending, and a refund undoes an expense. Here is how Raqm keeps your totals honest.',
    quickAnswer:
      'If every debit counts as spending, your totals are inflated. Raqm recognises a debit and credit of the same amount between your own accounts as a self-transfer, and links refunds to the original purchase so category totals show what you actually kept.',
    tag: 'How it works',
    publishedAt: '2026-11-05',
    updatedAt: '2026-11-08',
    cover: 2,
    body: [
      {
        type: 'p',
        text: 'Imagine you move 20,000 rupees from savings to your salary account and later return a shirt that cost 1,500. A naive tracker sees 20,000 spent, then 1,500 earned, and your month looks wild.',
      },
      { type: 'h2', text: 'The problem with counting every debit' },
      {
        type: 'p',
        text: 'Not every debit is an expense. Money moving between accounts you own is still your money. And a refund is not income: it is an expense being undone. **If a tracker cannot tell these apart, the totals say more about its limits than about your habits.**',
      },
      { type: 'h2', text: 'Self-transfers' },
      {
        type: 'p',
        text: 'When a debit and a credit with the same amount show up within 24 hours, in different accounts of yours, Raqm treats the pair as a self-transfer and keeps it out of your spending totals.',
      },
      { type: 'h2', text: 'Refunds' },
      {
        type: 'p',
        text: 'When a credit matches an earlier debit, Raqm links the two. The refund is netted against the category of the original purchase, so Shopping shows what you actually kept, not the gross amount.',
      },
      {
        type: 'callout',
        label: 'You stay in charge',
        text: 'These are automatic guesses, and guesses can be wrong. You can edit a transaction at any time, and deletions are soft, so you can restore them from the deleted list.',
      },
      { type: 'h2', text: 'Why we show our working' },
      {
        type: 'p',
        text: 'A tracker that quietly adjusts your numbers is hard to trust. Raqm links the matched transactions to each other, so you can open one and see why it was treated that way.',
      },
      { type: 'cta' },
      { type: 'h2', text: 'What it cannot know' },
      {
        type: 'p',
        text: 'If a refund arrives months later in a different amount, or a transfer goes to a friend rather than your own account, the match may not be made. Those cases need a manual fix. We would rather be honest about that than pretend the automation is perfect.',
      },
    ],
    faq: [
      {
        q: 'Are transfers between my accounts counted as spending?',
        a: 'No. A matching debit and credit between your own accounts within 24 hours is treated as a self-transfer and kept out of spending totals.',
      },
      {
        q: 'How are refunds handled?',
        a: 'A refund credit is linked to the original purchase and netted against that expense category.',
      },
      {
        q: 'Can I undo a wrong match?',
        a: 'Yes. You can edit any transaction, and deleted transactions can be restored.',
      },
    ],
  },
  {
    slug: 'why-raqm-starts-on-android',
    title: 'Why Raqm starts on Android',
    description:
      'The honest reason behind our launch order: Android lets an app read bank SMS, iOS does not. Here is what that means for each platform.',
    quickAnswer:
      'Raqm launches on Android first because Android allows apps to read SMS, which makes tracking automatic. iOS does not, so the iPhone version relies on manual entry and PDF statement import and is still in progress.',
    tag: 'Product',
    publishedAt: '2026-11-06',
    updatedAt: '2026-11-08',
    cover: 3,
    body: [
      {
        type: 'p',
        text: 'People often ask why Raqm is not on the App Store yet. The short answer is not about priorities. It is about what each phone lets an app do.',
      },
      { type: 'h2', text: 'Android: automatic capture' },
      {
        type: 'p',
        text: 'Android lets an app ask for permission to read SMS. That one permission is what makes zero-effort tracking possible: past bank alerts become history, and new ones become transactions as they arrive.',
      },
      { type: 'h2', text: 'iOS: a different road' },
      {
        type: 'p',
        text: 'iOS does not give apps access to your messages. So an iPhone version cannot work the same way, and pretending otherwise would be dishonest.',
      },
      {
        type: 'ul',
        items: [
          '**Manual entry.** Add a transaction in a few taps.',
          '**PDF statement import.** Bring in a bank or UPI statement and get structured transactions.',
        ],
      },
      {
        type: 'p',
        text: 'The goal is the same clear picture of your money, but the iPhone user does a little more work to get there. We are designing for that honestly, not squeezing one flow onto two platforms.',
      },
      { type: 'h2', text: 'Where things stand' },
      {
        type: 'p',
        text: 'Raqm is pre-launch. The Android app is the primary build and is not yet published; the iPhone version is in progress. The waitlist is the way to hear first when either is ready.',
      },
      { type: 'cta' },
      { type: 'h2', text: 'What stays the same everywhere' },
      {
        type: 'p',
        text: 'On both platforms your data stays on the device, tracking is calm and non-judgmental, and you can export what you have. The capture method differs. The principles do not.',
      },
    ],
    faq: [
      {
        q: 'When can I download Raqm?',
        a: 'Raqm is pre-launch and not published on any store yet. Join the waitlist to be told when it is ready.',
      },
      {
        q: 'Why not read SMS on iPhone?',
        a: 'iOS does not let apps read your messages, so the iPhone version uses manual entry and PDF import instead.',
      },
    ],
  },
];

export const TAGS = Array.from(new Set(POSTS.map((p) => p.tag)));

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getPost(slug: string) {
  return POSTS.find((p) => p.slug === slug);
}

export function sortedPosts() {
  return [...POSTS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getToc(post: Post) {
  return post.body
    .filter((b): b is Extract<Block, { type: 'h2' }> => b.type === 'h2')
    .map((b) => ({ id: slugify(b.text), title: b.text }));
}

export function readMinutes(post: Post) {
  const words = JSON.stringify(post.body.map((b) => ('text' in b ? b.text : 'items' in b ? b.items.join(' ') : ''))).split(/\s+/).length;
  return Math.max(2, Math.round(words / 220));
}

export function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
