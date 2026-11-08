import type { Post } from './posts';

export const POSTS_BATCH_C: Post[] = [
  {
    slug: 'offline-expense-manager-track-spending-without-internet',
    title: 'Offline expense manager: track spending with no internet',
    description:
      'Can an expense manager work without internet? What Raqm does fully offline on your Android phone, and the few things that do need a network connection.',
    quickAnswer:
      'An offline expense manager reads bank SMS, stores transactions and shows totals without any internet. Raqm does this on Android: SMS parsing, the database, budgets, analytics and export all run on the phone. Only the optional location map card needs a network, and voice logging needs an offline speech pack.',
    tag: 'How it works',
    publishedAt: '2026-11-08',
    updatedAt: '2026-11-08',
    cover: 0,
    body: [
      {
        type: 'p',
        text: 'Mobile data is patchy on a metro ride, in a lift, or on a trip. Many finance apps stop being useful the moment the signal drops, because they need a server to do their thinking. A truly offline expense manager does not have that problem.',
      },
      {
        type: 'p',
        text: '**The bank SMS on your phone arrived over the mobile network, not over the internet, so it can be read with data switched off.** What matters is whether the app needs a server after that. Raqm does not, for the core job.',
      },
      { type: 'h2', text: 'What offline means for an expense app' },
      {
        type: 'p',
        text: 'Offline here means three things: the app can read your transactions, store them and show you answers with no connection. If any of these three needs a server, the app is only partly offline. It is fair to ask each app which parts depend on a network.',
      },
      { type: 'h2', text: 'What works with no internet in Raqm' },
      {
        type: 'ul',
        items: [
          '**Reading bank SMS.** The parser runs on your phone and turns each alert into a transaction. It covers 120+ bank formats. New alerts are picked up as they arrive.',
          '**Storing your data.** Transactions are kept in a database on the device, not on a Raqm server. See [private by design](/features/private-by-design).',
          '**Categories and matching.** Sorting, self-transfer pairing, refund linking and recurring-charge detection all run on the stored data.',
          '**Budgets and safe-to-spend.** These are worked out from your local transactions and your pay cycle. See [smarter budgets](/features/smarter-budgets).',
          '**Analytics.** Category totals and month-over-month views are drawn from the same local data.',
          '**Adding cash spends by hand.** A few taps, no network involved.',
          '**Export.** CSV and the monthly PDF are made on the phone. See [export and import](/features/export).',
        ],
      },
      { type: 'h2', text: 'What needs a network, or help from another app' },
      {
        type: 'p',
        text: 'Honesty matters more than a tidy slogan, so here are the exceptions.',
      },
      {
        type: 'ul',
        items: [
          '**The location map card.** If you open the optional map for a transaction that has a location, the app asks OpenStreetMap for map tiles and a place name using that transaction coordinates. Offline, the map will not load. Everything else on the transaction still shows.',
          '**Voice logging.** Raqm on Android asks for the phone on-device speech recogniser. It prefers offline recognition, and if your language pack is not downloaded the app tells you and points you to the Android setting to get it. Not every phone offers on-device recognition, so voice may be unavailable on some devices.',
          '**Paying a split.** Raqm can prepare a UPI link for your share of a bill, but the payment itself happens in your UPI app, which needs its own connection.',
          '**Sharing a file.** Making a CSV or PDF is local. Sending it by email or chat uses whichever app you pick, and that app needs the internet.',
        ],
      },
      {
        type: 'callout',
        label: 'Easy to test',
        text: 'Put your phone in airplane mode and open Raqm. Your history, budgets and charts should still be there. If an app goes blank offline, it was keeping your data somewhere else.',
      },
      { type: 'h2', text: 'Why offline-first is also a privacy choice' },
      {
        type: 'p',
        text: 'When an app does not need a server to work, there is usually no reason to send your messages to one. That is why Raqm has no account and no analytics, and why your SMS and transactions stay on the device. The one network use today is the optional map card. The longer argument is in [why your bank SMS should stay on your phone](/blog/why-your-bank-sms-should-stay-on-your-phone), and the permission side is covered in [is it safe to give an expense app SMS permission](/blog/is-it-safe-to-give-an-expense-app-sms-permission).',
      },
      { type: 'h2', text: 'A day with no signal: an example' },
      {
        type: 'p',
        text: 'Here is an invented day. You travel on a train with no data. You pay Rs 240 for lunch by UPI, and your bank texts you. Raqm reads the alert, files it under Food and updates your safe-to-spend figure. A few hours later you pay Rs 1,800 for a ticket, and the same thing happens. When you get a signal back, nothing needs to sync, because there was nothing to catch up on.',
      },
      {
        type: 'p',
        text: 'That last point is the real benefit. Apps built around a server often queue work and sync later, and the totals can lag. An app that does the work on the phone has the answer immediately.',
      },
      { type: 'h2', text: 'Limits of working offline' },
      {
        type: 'ul',
        items: [
          '**No cloud backup from us.** Because data is local, Raqm has no copy. Export now and then, and keep the file somewhere safe.',
          '**One phone at a time.** Your history lives on the device you scanned on. There is no account that carries it to another phone by itself.',
          '**Only what your bank texts.** If your bank sends no SMS for a payment, add it by hand.',
        ],
      },
      { type: 'h2', text: 'A short offline checklist for any expense app' },
      {
        type: 'ol',
        items: [
          '**Open it in airplane mode** and see whether your history still loads.',
          '**Add a cash spend** and check that it saves.',
          '**Look at a chart or a budget** to see if it renders from local data.',
          '**Read the privacy page** for the list of network calls, and compare it with what you saw.',
        ],
      },
      {
        type: 'p',
        text: 'To see how the capture step works in detail, read [how to track expenses from bank SMS in India](/blog/track-expenses-from-bank-sms-in-india). The capture side is also on the [capture and organise page](/features/capture-organize).',
      },
      { type: 'cta' },
      {
        type: 'p',
        text: 'Raqm is pre-launch and Android first. Check the [download page](/download) for current status, or read the [FAQ](/faq) for permissions and supported banks.',
      },
    ],
    faq: [
      {
        q: 'Does Raqm work without internet?',
        a: 'Yes for the core job. Reading bank SMS, storing transactions, budgets, analytics and export all run on your phone. Only the optional location map card needs a network.',
      },
      {
        q: 'Can I use voice logging offline?',
        a: 'Raqm uses the on-device speech recogniser on Android and prefers offline recognition. You may need to download your language pack in Android settings, and some phones do not offer it.',
      },
      {
        q: 'Will I lose data if I reinstall without internet?',
        a: 'Data is stored on the phone, so uninstalling removes it. Export a CSV or monthly PDF first if you want a copy.',
      },
    ],
  },
  {
    slug: 'credit-card-payments-why-spending-gets-counted-twice',
    title: 'Credit card payments: why your spending gets counted twice',
    description:
      'Paying a credit card bill is not new spending, yet many trackers count it twice. How the double count happens and how Raqm keeps card payments out of totals.',
    quickAnswer:
      'Card spends and the later bill payment are the same money, so counting both doubles your spending. Raqm treats a debit and a credit of the same amount in two different accounts within 24 hours as a self-transfer and leaves the pair out of totals. It needs both alerts to arrive.',
    tag: 'How it works',
    publishedAt: '2026-11-08',
    updatedAt: '2026-11-08',
    cover: 1,
    body: [
      {
        type: 'p',
        text: 'You swipe a credit card all month. At the end, you pay the bill from your bank account. If a tracker counts both the swipes and the payment, your spending looks about twice as big as it really was.',
      },
      {
        type: 'p',
        text: '**A credit card bill payment is money moving from your bank to your card. It is not a new purchase.** The purchases were already counted when you made them.',
      },
      { type: 'h2', text: 'How the double count happens' },
      {
        type: 'p',
        text: 'Here is a made-up example. In one month you spend Rs 12,000 on a credit card across food, fuel and shopping. Your card issuer or bank texts you for each spend, so you have the purchases on record. Then you pay Rs 12,000 from your savings account. Your bank texts you a debit of Rs 12,000.',
      },
      {
        type: 'ul',
        items: [
          '**Correct total:** Rs 12,000, the purchases.',
          '**Double-counted total:** Rs 24,000, the purchases plus the payment.',
          '**Side effect:** a big debit with no category, which also throws off your budgets.',
        ],
      },
      {
        type: 'p',
        text: 'Nothing is wrong with the SMS. Each one is true on its own. The mistake is adding them together without noticing they describe the same rupees.',
      },
      { type: 'h2', text: 'Two ways to count it right' },
      {
        type: 'ol',
        items: [
          '**Count the swipes, skip the payment.** You see spending on the day it happened, with its category. This is the more useful view and the one Raqm follows.',
          '**Skip the swipes, count the payment.** You lose the categories, because the payment says nothing about what you bought. It is rarely worth it.',
        ],
      },
      { type: 'h2', text: 'How Raqm keeps card payments out of totals' },
      {
        type: 'p',
        text: 'Raqm keeps each card and bank account as its own account, using the bank name and the last four digits. When it sees a debit and a credit with the same amount, in different accounts of yours, within 24 hours, it treats them as a self-transfer. The pair is left out of spending totals. This is the same rule that handles moving money between your own bank accounts, covered in [self-transfers, refunds and your real spending](/blog/self-transfers-refunds-and-your-real-spending) and on the [smart matching page](/features/smart-matching).',
      },
      {
        type: 'p',
        text: 'For a card bill, the two sides are the debit from your bank account and the payment-received credit on the card. If your card issuer sends an alert for that credit and Raqm reads it as a credit, the two are paired.',
      },
      {
        type: 'callout',
        label: 'The pairing needs both alerts',
        text: 'Raqm can only pair what it can see. If the card issuer sends no payment-received SMS, or the two alerts land more than 24 hours apart, or the amounts differ, there is nothing to pair.',
      },
      { type: 'h2', text: 'When the pair does not match' },
      {
        type: 'p',
        text: 'A few common cases leave a bank debit on its own:',
      },
      {
        type: 'ul',
        items: [
          '**No credit alert from the card.** Some issuers do not text for payments received.',
          '**Late posting.** The card may show the payment a day or two after your bank debited it, which is outside the 24-hour window.',
          '**Different amounts.** If your bank debit and the card credit do not match to the rupee, they are not paired.',
          '**A card Raqm has not seen.** Without any alert from that card, there is no card account to pair with.',
        ],
      },
      {
        type: 'p',
        text: 'In these cases the bill payment stays as an ordinary debit. Open it in the transaction list to check it. If it is a mistake you can delete it, because deletes are soft and can be restored from More. Your card purchases stay counted either way.',
      },
      { type: 'h2', text: 'What this means for your budget' },
      {
        type: 'p',
        text: 'A budget only helps if each rupee is counted once. With card spends counted on the day you swipe, your Food or Shopping limit moves when you actually spend, not when the bill comes. That is the idea behind [budgets that follow your pay cycle](/features/smarter-budgets). It also means a large card bill landing right after payday does not look like a sudden jump in spending.',
      },
      {
        type: 'p',
        text: 'Example: your Food budget is Rs 8,000 for the cycle. You spend Rs 3,000 on the card early on. Your Food total shows Rs 3,000 now. When you pay the card bill later, Food stays at Rs 3,000, and the payment is not added anywhere.',
      },
      { type: 'p', text: 'A quick habit helps here. After you pay a card bill, glance at the transaction list the next day. A bill payment that has been paired is kept out of your totals. One that is still a plain debit tells you the card alert never arrived or did not match, and that is worth a look before you trust the month.' },
      { type: 'h2', text: 'Related double counts to watch for' },
      {
        type: 'ul',
        items: [
          '**Moving money between your own accounts.** Same rule, same fix.',
          '**Refunds.** A refund should reduce the original category, not appear as income. Raqm links the refund to the purchase.',
          '**Sharing a bill.** If you paid for friends, only your share is your spending. See [split and settle](/features/split).',
        ],
      },
      {
        type: 'p',
        text: 'If you want a plain walkthrough of how the SMS becomes a transaction in the first place, read [how to track expenses from bank SMS in India](/blog/track-expenses-from-bank-sms-in-india).',
      },
      { type: 'cta' },
      {
        type: 'p',
        text: 'Raqm is pre-launch and Android first. See the [download page](/download) for status, and the [FAQ](/faq) for supported banks.',
      },
    ],
    faq: [
      {
        q: 'Does Raqm count my credit card bill payment as spending?',
        a: 'Not when it can pair it. A debit from your bank and a matching credit on the card, within 24 hours, are treated as a self-transfer and left out of totals.',
      },
      {
        q: 'What if my card issuer does not send a payment SMS?',
        a: 'Then there is no credit to pair with, and the bank debit stays as an ordinary transaction. You can review it and delete it if it is a duplicate.',
      },
      {
        q: 'Are my card purchases still counted?',
        a: 'Yes. Each card purchase is counted on the day you made it, with its own category. Only the bill payment is left out when it is paired.',
      },
    ],
  },
];
