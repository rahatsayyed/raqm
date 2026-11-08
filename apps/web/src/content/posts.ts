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
      'Your bank texts hold a full diary of your spending. Here is why Raqm reads them on your phone and never uploads them.',
    quickAnswer:
      'Bank SMS contain amounts, merchants, account endings and balances. A private expense tracker should read them on your phone, store the result in a local database and never upload your messages. That is how Raqm works: no account, no analytics, and no server receiving your transactions.',
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
      {
        type: 'p',
        text: 'Here is a made-up example: "Rs 450.00 debited from A/c XX1234 on 05-11-26 to swiggy@upi. Bal Rs 12,340.50". Four facts in one line, and your balance is one of them. Ten such texts a week for a year is a financial profile.',
      },
      { type: 'h2', text: 'The usual way: link your bank' },
      {
        type: 'p',
        text: 'Many finance apps ask you to link a bank account or upload your messages so a server can process them. That can work well, but it means a company holds a copy of your financial activity, and you are trusting its security and its policies for as long as it exists. See how that compares on our [no bank login comparison](/free).',
      },
      { type: 'h2', text: 'How Raqm does it instead' },
      {
        type: 'p',
        text: 'On Android, Raqm reads the SMS already sitting on your phone. A parser built for 120+ bank formats pulls out the amount, merchant and account, the app sorts the transaction into a category, and the result is saved in a database on the device. The details are on the [capture and organise page](/features/capture-organize).',
      },
      {
        type: 'ol',
        items: [
          '**Read.** The SMS is read locally, with your permission.',
          '**Parse.** The text is turned into a structured transaction on the phone.',
          '**Store.** The transaction is saved in local storage. There is no Raqm server in this path.',
        ],
      },
      { type: 'h2', text: 'What does leave your phone' },
      {
        type: 'p',
        text: 'Honesty matters more than a perfect-sounding slogan. Your SMS and transactions never leave your phone, and the app has no account and no analytics. There is one small exception today: the optional location map. When you open a map card for a tagged transaction, the app asks OpenStreetMap for map tiles and a place name using that transaction coordinates.',
      },
      {
        type: 'callout',
        label: 'Planned, not available yet',
        text: 'Shared budgets (Budget Together) and AI insights are planned for later. Both would be optional and are not part of the app today. Read the [full privacy notice](/privacy) for the current state.',
      },
      { type: 'h2', text: 'What on-device does not mean' },
      {
        type: 'p',
        text: 'On-device is not magic. If you lose your phone without a backup, local data goes with it, and Raqm cannot recover it for you because it never had a copy. That is the trade: you hold the data, so you hold the responsibility. Export to CSV is there so you can keep your own copy; see [export and import](/features/export).',
      },
      { type: 'cta' },
      { type: 'h2', text: 'A simple test for any finance app' },
      {
        type: 'p',
        text: 'Before you give an app access to your messages, ask three things: where is my data processed, who can see it, and what happens to it if I delete the app. If the answers are not clear and short, think twice.',
      },
      {
        type: 'ul',
        items: [
          '**Does it need an account?** If yes, your data is probably tied to a server.',
          '**Does it ask for your bank login?** Reading SMS never needs one.',
          '**Does it work with airplane mode on?** Tracking from SMS already on your phone should.',
        ],
      },
      {
        type: 'p',
        text: 'More answers are in the [FAQ](/faq). If you want to see how SMS capture works in practice, read [how to track expenses from bank SMS in India](/blog/track-expenses-from-bank-sms-in-india).',
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
      'Indian banks text you for most debits and credits, so those messages can build your expense history automatically. Install a tracker that reads SMS on your phone, allow SMS access, run a first scan, then fix any wrong merchant once. Raqm does this on Android without a bank login.',
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
      { type: 'h2', text: 'Anatomy of a bank SMS' },
      {
        type: 'p',
        text: 'Banks word their alerts differently, but most carry the same four pieces. Here are two made-up examples to show the pattern.',
      },
      {
        type: 'ul',
        items: [
          '**UPI debit:** "Rs 450.00 debited from A/c XX1234 on 05-11-26 to swiggy@upi. Bal Rs 12,340.50". Amount 450, merchant Swiggy, account ending 1234.',
          '**Card spend:** "INR 2,199.00 spent on card XX5678 at AMAZON on 06-11-26". Amount 2,199, merchant Amazon, card ending 5678.',
        ],
      },
      {
        type: 'p',
        text: 'A parser reads those fields and builds one transaction. Raqm handles 120+ bank formats, covered in more detail on the [capture and organise page](/features/capture-organize).',
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
        type: 'p',
        text: 'Raqm is pre-launch, so you can [join the waitlist](/download) to hear when the Android app is ready.',
      },
      {
        type: 'callout',
        label: 'Good to know',
        text: 'Scans only add what is missing. If you edit or delete a transaction, a later scan does not bring the old version back.',
      },
      { type: 'h2', text: 'If a message is missed' },
      {
        type: 'ul',
        items: [
          '**Check the date range.** The first scan only looks as far back as you picked.',
          '**Check the permission.** Without SMS access nothing can be read.',
          '**Add it by hand.** Any transaction can be entered manually in a few taps.',
        ],
      },
      { type: 'h2', text: 'What about accounts that do not send SMS?' },
      {
        type: 'p',
        text: 'Some accounts never text you, and cash leaves no message at all. For those you can add an entry by hand. You can also import history today from an Axio CSV report or a Google Pay statement PDF. Bank statement PDF import is marked as coming soon in the app, so it is not available yet. On iPhone, where apps cannot read SMS, the plan is manual entry; that version is still in progress.',
      },
      { type: 'cta' },
      { type: 'h2', text: 'Reading the result' },
      {
        type: 'p',
        text: 'Once the history is in, the useful part begins: how much went to food this month, which subscriptions repeat, whether a budget is holding. Totals skip transfers between your own accounts and net out refunds, as explained in [self-transfers, refunds and your real spending](/blog/self-transfers-refunds-and-your-real-spending). The point is a calm look at what already happened, not a lecture about it.',
      },
      {
        type: 'p',
        text: 'Questions about permissions or supported banks? The [FAQ](/faq) has short answers.',
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
        a: 'iOS does not allow apps to read SMS, so the iPhone version is planned around manual entry. It is still in progress and not available yet.',
      },
    ],
  },
  {
    slug: 'self-transfers-refunds-and-your-real-spending',
    title: 'Self-transfers, refunds and your real spending',
    description:
      'Moving money between your own accounts is not spending, and a refund undoes an expense. Here is how Raqm keeps your totals honest.',
    quickAnswer:
      'If every debit counts as spending, your totals are inflated. Raqm treats a debit and a credit of the same amount between your own accounts within 24 hours as a self-transfer, and links a refund to its original purchase, so category totals show what you actually spent and kept.',
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
      { type: 'h2', text: 'Worked example in rupees' },
      {
        type: 'p',
        text: 'Take a month with Rs 30,000 of real spending. You also move Rs 20,000 from savings to your salary account, and you return a Rs 1,500 shirt.',
      },
      {
        type: 'ul',
        items: [
          '**Naive total:** 30,000 + 20,000 = Rs 50,000 spent, with the refund looking like extra income.',
          '**Honest total:** the Rs 20,000 transfer is left out, and the Rs 1,500 refund is netted against the shirt. Spending is Rs 30,000 minus Rs 1,500, so Rs 28,500, if the shirt was part of the 30,000.',
        ],
      },
      { type: 'h2', text: 'Self-transfers' },
      {
        type: 'p',
        text: 'When a debit and a credit with the same amount show up within 24 hours, in different accounts of yours, Raqm treats the pair as a self-transfer and keeps it out of your spending totals. This is the canonical rule on the [smart matching page](/features/smart-matching).',
      },
      { type: 'h2', text: 'Refunds' },
      {
        type: 'p',
        text: 'When a credit matches an earlier debit, Raqm links the two. The refund is netted against the category of the original purchase, so Shopping shows what you actually kept, not the gross amount. [Insights and analytics](/features/insights) then use those corrected numbers.',
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
      { type: 'h2', text: 'How to check your own totals' },
      {
        type: 'ol',
        items: [
          '**List your big credits.** Any large credit that is not salary is worth a look.',
          '**Find the matching debit.** Same amount, a day either side, from another of your accounts.',
          '**Look for refunds.** A credit from a shop you paid recently is usually one.',
        ],
      },
      {
        type: 'p',
        text: 'Raqm does this for you, but the same habit works on a paper statement. To see how the transactions get into the app in the first place, read [how to track expenses from bank SMS](/blog/track-expenses-from-bank-sms-in-india), or check the [FAQ](/faq).',
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
      'Raqm launches on Android first because Android lets apps read SMS with your permission, which makes expense tracking automatic. iOS does not allow that, so the iPhone version is planned around manual entry and is still in progress. Neither version is published yet.',
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
        text: 'Android lets an app ask for permission to read SMS. That one permission is what makes zero-effort tracking possible: past bank alerts become history, and new ones become transactions as they arrive. [How to track expenses from bank SMS in India](/blog/track-expenses-from-bank-sms-in-india) walks through the steps.',
      },
      { type: 'h2', text: 'iOS: a different road' },
      {
        type: 'p',
        text: 'iOS does not give apps access to your messages. So an iPhone version cannot work the same way, and pretending otherwise would be dishonest.',
      },
      {
        type: 'ul',
        items: [
          '**Manual entry.** Add a transaction in a few taps. This is the core of the planned iPhone version.',
          '**Statement import.** The Android app can import a Google Pay statement PDF today; whether and how that reaches iPhone is not decided.',
        ],
      },
      {
        type: 'p',
        text: 'The goal is the same clear picture of your money, but the iPhone user does a little more work to get there. We are designing for that honestly, not squeezing one flow onto two platforms.',
      },
      { type: 'h2', text: 'Why not scrape notifications or ask for a bank login?' },
      {
        type: 'p',
        text: 'There are shortcuts on other platforms, such as linking a bank account through a third party. We chose not to: a bank login means someone else holds your financial data. Read why in [why your bank SMS should stay on your phone](/blog/why-your-bank-sms-should-stay-on-your-phone).',
      },
      { type: 'h2', text: 'Where things stand' },
      {
        type: 'p',
        text: 'Raqm is pre-launch. The Android app is the primary build and is not yet published; the iPhone version is in progress. The waitlist is the way to hear first when either is ready, and the [download page](/download) shows the current status.',
      },
      { type: 'cta' },
      { type: 'h2', text: 'What stays the same everywhere' },
      {
        type: 'p',
        text: 'On both platforms your SMS and transactions stay on the device, tracking is calm and non-judgmental, and you can export what you have. The capture method differs. The principles do not.',
      },
      { type: 'h2', text: 'What to expect at launch' },
      {
        type: 'ul',
        items: [
          '**Android first.** Automatic SMS capture, budgets, widgets and export.',
          '**No account.** You open the app and start.',
          '**Honest labels.** Anything not built yet is marked as coming later, like [Budget Together](/features/budget-together).',
        ],
      },
      {
        type: 'p',
        text: 'See everything that is planned on the [features page](/features), or read the [FAQ](/faq).',
      },
    ],
    faq: [
      {
        q: 'When can I download Raqm?',
        a: 'Raqm is pre-launch and not published on any store yet. Join the waitlist to be told when it is ready.',
      },
      {
        q: 'Why not read SMS on iPhone?',
        a: 'iOS does not let apps read your messages, so the iPhone version is planned around manual entry instead.',
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
