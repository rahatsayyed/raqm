import type { Post } from './posts';

export const POSTS_BATCH_B: Post[] = [
  {
    slug: 'bank-sms-parser-for-india-how-it-works',
    title: 'Bank SMS parser for India: how it works, open source',
    description:
      'How a bank SMS parser turns an alert into amount, merchant and account. A developer walkthrough of the parser behind Raqm, with a made-up example.',
    quickAnswer:
      'A bank SMS parser reads the text of an alert and returns structured data: amount, debit or credit, merchant, account ending and balance. Raqm uses an open-source TypeScript parser, @rahatsayyed/bank-sms-parser, covering 120+ bank formats. It runs in Node.js and React Native, so parsing can happen on the phone.',
    tag: 'How it works',
    publishedAt: '2026-11-08',
    updatedAt: '2026-11-08',
    cover: 1,
    body: [
      {
        type: 'p',
        text: 'Every bank in India writes its alerts a little differently. One says "debited", another says "spent", a third puts the merchant before the amount. For a developer, that is the whole difficulty: the same event, many sentences. A bank SMS parser is the piece of code that hides that mess.',
      },
      { type: 'h2', text: 'What a parser has to produce' },
      {
        type: 'p',
        text: 'The goal is a single, predictable object, whatever the bank wrote. For each message the parser tries to return these fields:',
      },
      {
        type: 'ul',
        items: [
          '**Amount.** Always a positive number.',
          '**Type.** Expense, income, transfer, investment, or a balance update with no transaction.',
          '**Merchant.** The shop or payee, when the text names one.',
          '**Account ending.** The last four digits, so you can tell accounts apart.',
          '**Balance.** The available balance after the payment, when the bank includes it.',
          '**Bank name, sender and time.** Where the message came from and when.',
        ],
      },
      { type: 'h2', text: 'A made-up example' },
      {
        type: 'p',
        text: 'Here is an invented alert: "Rs.1,500.00 debited from a/c **4321 on 20-06-2026. Info: UPI-Swiggy. Avl Bal: Rs.24,500.00". The parser reads it as an expense of 1,500, merchant Swiggy, account ending 4321, balance 24,500. The same kind of result comes back for a card spend or a credit, with a different type.',
      },
      { type: 'h2', text: 'Why 120+ formats are needed' },
      {
        type: 'p',
        text: 'There is no standard. Sender IDs differ, wording differs, and a single bank often sends several layouts for cards, UPI, cheques and credit cards. A parser built for one bank breaks on the next. So the package keeps a separate parser per bank and picks one from the sender ID. It also has a helper to check whether a sender is a known bank at all, which is a cheap way to skip messages that are not bank alerts.',
      },
      { type: 'h2', text: 'Using it in a project' },
      {
        type: 'p',
        text: 'The package is `@rahatsayyed/bank-sms-parser`. It is written in TypeScript, has no native dependencies and works in Node.js, React Native and plain JavaScript projects. You pass in the message text, the sender and a timestamp, and get back a transaction or nothing.',
      },
      {
        type: 'ol',
        items: [
          '**Install it** from npm with your usual package manager.',
          '**Call the factory** with the SMS body, the sender ID and the time.',
          '**Check for a result.** If the text is not a recognised bank alert, you get nothing back, so handle that case.',
          '**Store what you get.** Persist the structured fields, not just the raw text.',
        ],
      },
      {
        type: 'callout',
        label: 'Check the licence',
        text: 'The parser is released under AGPL-3.0. That licence has conditions if you use it in a networked product, so read it before you build on it.',
      },
      { type: 'h2', text: 'Where Raqm uses it' },
      {
        type: 'p',
        text: 'Raqm on Android reads the SMS on your phone and passes each one through this parser. The result is categorised and saved in a local database. Because the parser is plain code with no network calls of its own, the reading never needs a server. That is the basis of the [private by design](/features/private-by-design) approach, and the capture side is covered on the [capture and organise page](/features/capture-organize).',
      },
      { type: 'h2', text: 'How to test a parser before you trust it' },
      {
        type: 'p',
        text: 'If you plan to build on any SMS parser, do not judge it by the banks in the demo. Judge it by your own messages. Collect a handful of real alerts from your accounts, remove personal details, and run them through. Then check each output by eye.',
      },
      {
        type: 'ul',
        items: [
          '**Debits and credits.** Is the type right for both a payment and a refund?',
          '**Odd amounts.** Commas, decimals and large values such as Rs 1,25,000.00 should all come out as one correct number.',
          '**Missing merchant.** Does it return nothing for the merchant, rather than a wrong guess?',
          '**Non-bank texts.** Offers, one-time passwords and delivery updates should not become transactions.',
        ],
      },
      {
        type: 'p',
        text: 'A parser that says "no result" is better than one that invents a transaction. A false row in someone\'s spending history is harder to find and more annoying than a missing one that they can add by hand.',
      },
      {
        type: 'p',
        text: 'The package ships with its own jest test suite, which is where new bank formats are checked against sample messages. It is published on npm as @rahatsayyed/bank-sms-parser, and its source is on GitHub. Because it is licensed AGPL-3.0, read the terms before you use it in a product of your own.',
      },
      { type: 'cta' },
      { type: 'h2', text: 'What a parser cannot do alone' },
      {
        type: 'p',
        text: 'Parsing gives you clean rows. It does not tell you whether a debit was a real expense. A move between your own accounts and a refund both look like ordinary transactions. Raqm adds a second step on top: [matching self-transfers, refunds and duplicates](/features/smart-matching). It is explained with rupee examples in [self-transfers, refunds and your real spending](/blog/self-transfers-refunds-and-your-real-spending).',
      },
      { type: 'h2', text: 'Honest limits' },
      {
        type: 'ul',
        items: [
          '**Banks change wording.** A new layout can slip through until a parser is updated.',
          '**Not every message has a merchant.** Some alerts name only a reference number.',
          '**Fallback is manual.** If a transaction is missed, any transaction can be added by hand.',
        ],
      },
      {
        type: 'p',
        text: 'If you are not a developer and just want the result, read [how to track expenses from bank SMS in India](/blog/track-expenses-from-bank-sms-in-india). Questions about supported banks are in the [FAQ](/faq).',
      },
    ],
    faq: [
      {
        q: 'Which package should I install?',
        a: 'The package is @rahatsayyed/bank-sms-parser. It handles 120+ Indian and international bank SMS formats and is written in TypeScript.',
      },
      {
        q: 'Does the parser send messages anywhere?',
        a: 'No. It is plain code that works on text you pass in, with no native dependencies. Where the text goes next is up to the app using it.',
      },
      {
        q: 'What licence does it use?',
        a: 'AGPL-3.0. Read the licence terms before using it in your own product.',
      },
    ],
  },
  {
    slug: 'expense-tracker-for-android-in-india-what-to-look-for',
    title: 'Expense tracker for Android in India: what to look for',
    description:
      'Choosing an expense tracker for Android in India? Seven things worth checking before you install one, from SMS capture and privacy to export and widgets.',
    quickAnswer:
      'A good expense tracker for Android in India reads your bank SMS automatically, works without a bank login, keeps data on your phone, handles UPI and cards, gives honest totals, and lets you export your data. Check those seven things before you install anything. Raqm is built around them and is on the waitlist.',
    tag: 'Guides',
    publishedAt: '2026-11-08',
    updatedAt: '2026-11-08',
    cover: 2,
    body: [
      {
        type: 'p',
        text: 'Search for expense trackers and you will find a long list of options that all look similar in screenshots. The differences that matter are hidden: how money gets in, who holds the data, and whether the totals are honest. Here are seven checks that cut through the noise.',
      },
      { type: 'h2', text: '1. How do transactions get in?' },
      {
        type: 'p',
        text: 'Manual entry works for a week and then fades. On Android, an app can read bank SMS with your permission, so entries appear on their own. Ask whether the app does that, and whether it catches new alerts live as well as old ones. The steps are in [how to track expenses from bank SMS in India](/blog/track-expenses-from-bank-sms-in-india).',
      },
      { type: 'h2', text: '2. Does it need a bank login or an account?' },
      {
        type: 'p',
        text: 'Linking a bank often means a third party holds your financial data. An SMS-based tracker does not need that. **If you can get the same result without handing over a login, you probably should.** Raqm needs no account and no bank login. See the [comparison](/free) for how that differs from the usual approach.',
      },
      { type: 'h2', text: '3. Where does the processing happen?' },
      {
        type: 'p',
        text: 'The same SMS permission can mean on-device parsing or uploading to a server. Look for a clear statement. Raqm parses on the phone and stores transactions in a local database, as explained in [is it safe to give an expense app SMS permission](/blog/is-it-safe-to-give-an-expense-app-sms-permission).',
      },
      { type: 'h2', text: '4. Does it understand India?' },
      {
        type: 'ul',
        items: [
          '**Many banks.** Formats differ widely. Raqm supports 120+ bank formats.',
          '**UPI and cards.** Both should be recognised, along with credit card alerts.',
          '**Rupees and pay cycles.** Amounts in INR, and a month that can start on your salary date.',
        ],
      },
      { type: 'h2', text: '5. Are the totals honest?' },
      {
        type: 'p',
        text: 'If you move Rs 10,000 between your own accounts and the app counts it as spending, the month looks wrong. Check that the app handles transfers and refunds. Raqm pairs a matching debit and credit between your own accounts and links refunds to the original purchase. Details are on the [smart matching page](/features/smart-matching).',
      },
      { type: 'h2', text: '6. Does it help you act, not just record?' },
      {
        type: 'p',
        text: 'A list of transactions is only the start. Look for budgets that follow your pay cycle and a number that tells you what is safe to spend. Raqm has [budgets with a safe-to-spend figure](/features/smarter-budgets) and seven Android home-screen widgets, so a glance at your home screen answers the question. Widgets can hide amounts when you want privacy. See [widgets](/features/widgets).',
      },
      { type: 'h2', text: '7. Can you leave?' },
      {
        type: 'p',
        text: 'Good tools let you take your data with you. Check for export to a spreadsheet and a readable report. Raqm exports to CSV and shares a monthly PDF. It can also import history from a Google Pay statement PDF or a supported CSV report. Bank statement PDF import is not available yet. See [export and import](/features/export).',
      },
      { type: 'h2', text: 'Traps to avoid' },
      {
        type: 'ul',
        items: [
          '**Judging by screenshots.** Every app looks calm with sample data. Ask how it behaves with your real, messy history.',
          '**Ignoring cash.** Some spending leaves no SMS at all. A good tracker lets you add it in a few taps. Raqm also has [notes, lending reminders and grocery lists](/features/life-admin) for the small stuff.',
          '**Trusting one big number.** A total with no way to open it and see why is hard to believe.',
          '**Forgetting about deletion.** You will fix mistakes. Check that deleting is reversible. In Raqm, deletes are soft and can be restored.',
        ],
      },
      {
        type: 'p',
        text: 'Try this on a free afternoon. Install the app, scan a short date range, and open three random transactions. Check that the amount, the payee and the category look right, and fix one to see whether the app remembers your change. Ten minutes of testing with your own messages tells you more than any feature list.',
      },
      { type: 'cta' },
      { type: 'h2', text: 'A quick scorecard' },
      {
        type: 'p',
        text: 'Give any app one point for each check it passes. Be honest about the ones it is vague on.',
      },
      {
        type: 'ol',
        items: [
          '**Automatic capture from SMS.**',
          '**No bank login or account.**',
          '**Clear on-device processing.**',
          '**Works with Indian banks, UPI and cards.**',
          '**Transfers and refunds handled.**',
          '**Budgets and a safe-to-spend view.**',
          '**Export and import.**',
        ],
      },
      {
        type: 'p',
        text: 'Be careful with any app that is vague about the second and third points. Those are the ones you cannot fix later.',
      },
      {
        type: 'p',
        text: 'Here is an example, with invented numbers. An app scores 5 out of 7 but is vague on where it processes data. Another scores 4 but is clear on every privacy point. For finance, the second may be the better choice, because a missing feature can be added later while a data habit is hard to undo. Weigh the checks, do not just count them.',
      },
      { type: 'h2', text: 'Where Raqm stands today' },
      {
        type: 'p',
        text: 'Raqm is pre-launch. The Android app is not on Google Play yet, and the iPhone version is in progress with manual entry only for now. You can read the full list on the [features page](/features) and check [download status](/download). The [FAQ](/faq) answers the most common questions.',
      },
    ],
    faq: [
      {
        q: 'What is the most important thing to check?',
        a: 'Where your data is processed. Automatic SMS capture is convenient, but you should know whether parsing happens on your phone or on a server.',
      },
      {
        q: 'Do I need to link my bank account for automatic tracking?',
        a: 'No. On Android, an app can read bank SMS with your permission. Raqm works that way and does not ask for a bank login.',
      },
      {
        q: 'Is Raqm available to install?',
        a: 'Not yet. Raqm is pre-launch, so the waitlist is open. Android comes first and iPhone is in progress.',
      },
    ],
  },
];
