import type { Post } from './posts';

export const POSTS_BATCH_A: Post[] = [
  {
    slug: 'how-to-track-upi-spending-automatically',
    title: 'How to track UPI spending automatically',
    description:
      'UPI makes paying easy and tracking hard. Here is how to turn the bank alerts you already get into a clear, automatic record of your UPI spending.',
    quickAnswer:
      'To track UPI spending automatically, use the debit alerts your bank already sends. An SMS-based tracker reads each alert on your phone, pulls out the amount and payee, and sorts it into a category. Raqm does this on Android with no bank login, and you can fix a payee once.',
    tag: 'Guides',
    publishedAt: '2026-11-08',
    updatedAt: '2026-11-08',
    cover: 1,
    body: [
      {
        type: 'p',
        text: 'UPI is quick. You scan, tap, enter a PIN, and it is done in seconds. That speed is also the problem. Ten small payments a day do not feel like spending, and at month end the total surprises you.',
      },
      {
        type: 'p',
        text: 'The good news is that each of those payments usually leaves a trace. **Your bank tells you about most UPI debits by SMS, so the record already exists.** You only need a way to read it.',
      },
      { type: 'h2', text: 'Why UPI is hard to track by hand' },
      {
        type: 'ul',
        items: [
          '**Many small payments.** Tea, auto fare, groceries. Each one is too small to bother noting.',
          '**Several apps.** You may pay from more than one UPI app and more than one bank account.',
          '**Payees look cryptic.** A UPI handle or a shop name is not always what you would call it.',
        ],
      },
      { type: 'h2', text: 'What a UPI alert looks like' },
      {
        type: 'p',
        text: 'Banks word these differently, so treat this as a made-up example only: "Rs 180.00 debited from A/c XX1234 on 07-11-26 to chaiwala@upi. Bal Rs 8,420.00". It carries an amount, a date, the last digits of your account and a payee. That is enough to log a transaction.',
      },
      {
        type: 'callout',
        label: 'Not every payment may text you',
        text: 'Some banks skip alerts for certain payments or settings. If a payment has no SMS, a tracker based on SMS cannot see it. Check what your own bank sends.',
      },
      { type: 'h2', text: 'The automatic way, step by step' },
      {
        type: 'ol',
        items: [
          '**Choose a tracker that reads SMS on the phone.** It should not need a bank login. See why in [why your bank SMS should stay on your phone](/blog/why-your-bank-sms-should-stay-on-your-phone).',
          '**Allow SMS access.** On Android this is a permission you can switch off later.',
          '**Scan your past alerts.** Pick a date range so your history fills in at once.',
          '**Fix a payee once.** If "chaiwala@upi" should read "Tea", change it and the app remembers that payee.',
          '**Leave it running.** New alerts are turned into transactions as they arrive.',
        ],
      },
      {
        type: 'p',
        text: 'Raqm follows exactly these steps on Android. The [capture and organise page](/features/capture-organize) explains the parser, which handles 120+ bank SMS formats. For a longer walkthrough, read [how to track expenses from bank SMS in India](/blog/track-expenses-from-bank-sms-in-india).',
      },
      { type: 'h2', text: 'Three traps that skew UPI totals' },
      {
        type: 'h3',
        text: 'Paying yourself',
      },
      {
        type: 'p',
        text: 'Say you send Rs 5,000 from one of your accounts to another. Your bank texts a debit on one side and a credit on the other. If both count, your spending looks Rs 5,000 higher. Raqm pairs a matching debit and credit of the same amount within 24 hours across your accounts and keeps the pair out of spending. More in [self-transfers, refunds and your real spending](/blog/self-transfers-refunds-and-your-real-spending).',
      },
      {
        type: 'h3',
        text: 'Refunds',
      },
      {
        type: 'p',
        text: 'A cancelled order may come back as a UPI credit. Example: you pay Rs 800, then get Rs 800 back. Real spending for that purchase is zero. Raqm links the credit to the original payment and nets it against that category.',
      },
      {
        type: 'h3',
        text: 'Money for others',
      },
      {
        type: 'p',
        text: 'If you pay a restaurant bill for four people, only your share is your spending. Raqm has a split feature for this: you split the bill and send a prefilled UPI link. When a matching credit shows up in your SMS, Raqm flags it for you to confirm as that person paying you back. Payments are made in your own UPI app. See [split and settle](/features/split).',
      },
      { type: 'h2', text: 'Bringing in older UPI history' },
      {
        type: 'p',
        text: 'If you want history from before you started, the Android app can import a Google Pay statement PDF. Bank statement PDF import is marked as coming soon and is not available yet. Anything else can be added by hand in a few taps.',
      },
      { type: 'h2', text: 'What to look at once the data is in' },
      {
        type: 'ul',
        items: [
          '**Top payees.** Which three or four payees take most of your money?',
          '**Small payments added up.** Sum one category, such as food delivery, for the month. The total is often larger than you guessed.',
          '**Weekends versus weekdays.** Look for a pattern, not a verdict.',
        ],
      },
      {
        type: 'p',
        text: 'A calm look at what already happened is enough. If you want a limit as well, [budgets that follow your salary date](/features/smarter-budgets) can warn you before a category runs out.',
      },
      { type: 'h2', text: 'A simple monthly routine' },
      {
        type: 'p',
        text: 'Tracking only helps if you look at it. Pick one day a month, such as the day after payday. Open your list and check three things: the biggest payees, any payee you do not recognise, and any category that grew a lot. Fix a name if it is wrong. That takes about five minutes.',
      },
      {
        type: 'p',
        text: 'Cash is the gap in any UPI record. If you withdraw Rs 2,000 from an ATM, the withdrawal shows up as one debit, but what you buy with it does not. Add the big cash purchases by hand and leave the small ones. A rough picture beats a perfect one you never finish.',
      },
      {
        type: 'p',
        text: 'Last, remember that a tracker shows what happened. It does not judge it. The aim is to notice, not to feel bad about a Rs 60 tea.',
      },
      { type: 'cta' },
      {
        type: 'p',
        text: 'Raqm is pre-launch. See the [download page](/download) for current status, or read the [FAQ](/faq) for permissions and supported banks.',
      },
    ],
    faq: [
      {
        q: 'Can I track UPI spending without linking my bank account?',
        a: 'Yes. A tracker that reads the bank SMS already on your phone does not need a bank login. Raqm works this way on Android.',
      },
      {
        q: 'What if my bank does not send an SMS for a UPI payment?',
        a: 'An SMS-based tracker cannot see a payment that has no SMS. You can add it by hand, or import a Google Pay statement PDF in Raqm for older history.',
      },
      {
        q: 'Does Raqm work with UPI on iPhone?',
        a: 'iOS does not let apps read SMS, so the planned iPhone version uses manual entry. It is still in progress and not available yet.',
      },
    ],
  },
  {
    slug: 'is-it-safe-to-give-an-expense-app-sms-permission',
    title: 'Is it safe to give an expense app SMS permission?',
    description:
      'SMS permission is powerful, so ask before you allow it. A plain checklist for judging any expense tracker, and what Raqm does with the messages it reads.',
    quickAnswer:
      'SMS permission lets an app read your messages, so it is safe only if the app explains why it needs it, processes messages on your phone, needs no account and shows what leaves the device. Ask four questions before allowing it. Raqm parses bank SMS on-device and keeps transactions in a local database.',
    tag: 'Privacy',
    publishedAt: '2026-11-08',
    updatedAt: '2026-11-08',
    cover: 0,
    body: [
      {
        type: 'p',
        text: 'Reading SMS is a big permission. Your messages can hold bank alerts, delivery updates, personal chats and one-time codes. Asking "is this safe?" before you tap Allow is the right instinct.',
      },
      {
        type: 'p',
        text: '**Safe is not a yes or no answer. It depends on what the app does with the messages after it reads them.** This checklist helps you judge that for any expense tracker, including ours.',
      },
      { type: 'h2', text: 'Why expense apps ask for SMS at all' },
      {
        type: 'p',
        text: 'Indian banks text you for most debits and credits. An app that reads those texts can build your spending history without you typing anything. Without the permission, there is nothing for it to read. So the request has a real reason. The question is how well the app handles what it reads.',
      },
      { type: 'h2', text: 'The four-question checklist' },
      {
        type: 'h3',
        text: '1. Where are the messages processed?',
      },
      {
        type: 'p',
        text: 'Best case: on your phone. The app reads the SMS, turns it into a transaction, and stores the result locally. Worse case: the app uploads raw messages to a server to be processed. If the app does not say, treat that as a red flag. Our post on [why your bank SMS should stay on your phone](/blog/why-your-bank-sms-should-stay-on-your-phone) explains the difference.',
      },
      {
        type: 'h3',
        text: '2. Does it need an account or your bank login?',
      },
      {
        type: 'p',
        text: 'Reading SMS never needs a bank password. If an SMS-based app asks for one, ask why. An account may also tie your data to a server. Raqm has no account and no sign-up, so there is no profile on our side to leak.',
      },
      {
        type: 'h3',
        text: '3. What leaves the phone, and when?',
      },
      {
        type: 'p',
        text: 'A good app tells you plainly. For Raqm, your SMS and transactions stay on the device and there are no analytics. One optional exception exists: the location map card asks OpenStreetMap for map tiles and a place name using that transaction coordinates. Planned features such as shared budgets and AI insights are not in the app today. The [privacy notice](/privacy) lists the current state.',
      },
      {
        type: 'h3',
        text: '4. Can you undo it?',
      },
      {
        type: 'p',
        text: 'You should be able to turn the permission off in Android settings, delete your data, and keep a copy. In Raqm, deleted transactions are soft-deleted and can be restored, and you can export everything to CSV. See [export and import](/features/export).',
      },
      { type: 'h2', text: 'Which messages does the app actually use?' },
      {
        type: 'p',
        text: 'An expense tracker only needs bank transaction alerts. Raqm turns messages it recognises as bank alerts into transactions, and ignores the rest. A message it cannot match to a bank format does not become a transaction.',
      },
      {
        type: 'callout',
        label: 'About one-time codes',
        text: 'Bank OTP messages are not transactions, so they should never end up in your expense list. If an app shows OTPs in its lists, think twice about it.',
      },
      { type: 'h2', text: 'Small things that show care' },
      {
        type: 'ul',
        items: [
          '**Raw alerts tidied away.** Raqm can replace the raw bank SMS notification with a clean one, so card and balance details are not left on the lock screen. This needs notification access, which Android asks for separately.',
          '**Amounts can be masked.** You can hide amounts in lists and widgets, and reveal one with a tap.',
          '**Clear permission screens.** The app should explain what each permission is for before you grant it.',
        ],
      },
      { type: 'h2', text: 'What else Raqm asks for on Android' },
      {
        type: 'p',
        text: 'Onboarding asks for four things: reading bank SMS, notifications, notification access (to tidy raw bank alerts) and location (to tag where a payment happened, even when an SMS arrives in the background). In the current build all four are needed to finish setup. The microphone is asked only when you first use voice logging for a cash spend. Android lets you change any of them later.',
      },
      { type: 'h2', text: 'What you should still do yourself' },
      {
        type: 'ol',
        items: [
          '**Install only from a store listing you trust,** and check the developer name.',
          '**Read the permissions list.** An expense tracker has no need for your contacts or camera, for example.',
          '**Test with airplane mode.** Tracking from SMS already on your phone should still work.',
          '**Review access now and then** in Android settings, and switch off what you no longer use.',
        ],
      },
      { type: 'h2', text: 'The honest limit' },
      {
        type: 'p',
        text: 'On-device does not mean risk-free. If your phone is lost and not locked, someone may see the data on it. If you uninstall without exporting, Raqm cannot recover your history because it never had a copy. Lock your phone and export now and then. That is the trade for holding your own data.',
      },
      { type: 'h2', text: 'Questions to ask the developer' },
      {
        type: 'p',
        text: 'If a privacy page is vague, ask. A good developer answers in plain words. These are fair questions for any finance app:',
      },
      {
        type: 'ul',
        items: [
          '**Do you store my messages on a server, even for a short time?**',
          '**Do you share any data with advertisers or analytics tools?**',
          '**What network calls does the app make, and why?**',
          '**What can I delete, and does deletion also remove it from your side?**',
        ],
      },
      {
        type: 'p',
        text: 'Raqm has a short answer to each: no server receives your messages, there are no analytics, the only network use is the optional location map, and since nothing is held on our side there is nothing to delete there. The [privacy notice](/privacy) sets this out.',
      },
      {
        type: 'p',
        text: 'You do not have to trust a promise. Look for an app that gives you reasons you can check yourself, such as working with no internet and no sign-up.',
      },
      { type: 'cta' },
      {
        type: 'p',
        text: 'Raqm is not on any store yet. The [FAQ](/faq) answers permission questions in short form, and the [comparison with the usual bank-linking approach](/free) shows the differences side by side.',
      },
    ],
    faq: [
      {
        q: 'Does Raqm read all my SMS?',
        a: 'It reads messages so it can find bank transaction alerts and turn them into transactions. Messages it cannot recognise as bank alerts are not turned into transactions.',
      },
      {
        q: 'Can I remove the SMS permission later?',
        a: 'Yes. You can switch it off in Android settings at any time. Without it, new alerts cannot be read, but transactions already saved stay on your phone.',
      },
      {
        q: 'Does Raqm need my bank login or an account?',
        a: 'No. Raqm has no account, and it works from the SMS on your phone, so it never asks for bank login details.',
      },
    ],
  },
  {
    slug: 'budgeting-on-a-salary-cycle',
    title: 'Budgeting on a salary cycle: start your month on payday',
    description:
      'Your money month starts on payday, not on the 1st. How to set a budget cycle that matches your salary date, with simple rupee examples you can adapt.',
    quickAnswer:
      'A salary-cycle budget starts your month on payday instead of the 1st, so each cycle matches the money you actually received. Pick your payday as the start date, set limits per category and watch the days left. Raqm lets you set a custom month-start day from 1 to 28.',
    tag: 'Guides',
    publishedAt: '2026-11-08',
    updatedAt: '2026-11-08',
    cover: 3,
    body: [
      {
        type: 'p',
        text: 'Most calendars say the month starts on the 1st. Most salaries do not. If you get paid on the 25th, the money you can spend arrives in the last week of one calendar month and has to last into the next.',
      },
      {
        type: 'p',
        text: '**A budget that ignores your payday splits your money across two months and makes both look wrong.** A salary-cycle budget fixes that by starting your month when the money arrives.',
      },
      { type: 'h2', text: 'The problem with calendar months' },
      {
        type: 'p',
        text: 'Here is a made-up example. Your salary lands on the 25th. By the 31st you pay rent and a few bills, so the old month ends looking heavy. Then the new month begins with almost nothing in the account, and the 1st to 24th looks like a time of low income and high spending. Neither picture is useful.',
      },
      { type: 'h2', text: 'What a salary cycle means' },
      {
        type: 'p',
        text: 'A salary cycle runs from one payday to the day before the next. If you are paid on the 25th, your cycle is the 25th to the 24th. Every total, budget and comparison is then measured over that window.',
      },
      {
        type: 'ul',
        items: [
          '**Income and spending line up.** The money that arrived is the money being measured.',
          '**Month-over-month comparison is fair.** Each cycle has your whole pay and the full set of bills.',
          '**You see the real gap.** What is left on the 20th is what has to last until payday.',
        ],
      },
      { type: 'h2', text: 'How to set one up' },
      {
        type: 'ol',
        items: [
          '**Pick the start day.** Use the day your salary usually arrives. Raqm accepts a start day from 1 to 28.',
          '**List fixed costs first.** Rent, EMIs, insurance and school fees come out before anything else.',
          '**Give each category a limit.** Food, transport, shopping. Use last cycle as your guide.',
          '**Set one overall plan if you like.** A single monthly number covers spending in categories you did not budget.',
          '**Review at payday.** Look at what happened, adjust a limit, move on.',
        ],
      },
      { type: 'h2', text: 'A worked example in rupees' },
      {
        type: 'p',
        text: 'These numbers are examples only. Say you take home Rs 50,000 on the 25th. Fixed costs come to Rs 22,000. You decide on Rs 8,000 for food, Rs 3,000 for transport and Rs 5,000 for shopping. That is Rs 38,000 planned, leaving Rs 12,000 as a buffer or for savings.',
      },
      {
        type: 'p',
        text: 'Now suppose it is the 10th of the cycle and you have spent Rs 6,500 on food. With 15 days to go, you have Rs 1,500 left in that category, about Rs 100 a day. That daily figure is more useful than a monthly total. Raqm shows a safe-to-spend number built the same way, after bills due in the next seven days are taken off.',
      },
      { type: 'h2', text: 'How safe-to-spend is worked out' },
      {
        type: 'p',
        text: 'Raqm takes your monthly plan, subtracts what you have spent so far this period and the bills due in the next seven days, then divides what is left by the days remaining. Example with made-up numbers: a plan of Rs 30,000, Rs 18,000 spent and Rs 3,000 of bills due soon leaves Rs 9,000. With 15 days to go, that is Rs 600 a day. If you have not set a monthly plan, Raqm uses what is left across your category budgets instead, and you can tap the card to see how the number was built.',
      },
      {
        type: 'callout',
        label: 'Use a spare month first',
        text: 'If your numbers are new to you, track one full cycle before setting hard limits. Limits based on a guess tend to be broken by day ten.',
      },
      { type: 'h2', text: 'What Raqm does with your cycle' },
      {
        type: 'p',
        text: 'In Raqm you set a custom month-start day, and the same cycle drives your budgets, alerts, analytics and exports, so the screens never disagree. A fixed-length cycle of a set number of days is also an option. Category budgets send an alert at 80% and again at 100% by default, and you can opt in to rollover so unused budget carries into the next period. Details are on the [smarter budgets page](/features/smarter-budgets).',
      },
      {
        type: 'p',
        text: 'The budget numbers depend on honest totals. Raqm leaves out transfers between your own accounts and nets refunds against the original purchase, as explained in [self-transfers, refunds and your real spending](/blog/self-transfers-refunds-and-your-real-spending). The [insights page](/features/insights) shows how the pay-cycle comparison works.',
      },
      { type: 'h2', text: 'Common mistakes' },
      {
        type: 'ul',
        items: [
          '**Counting bill payments twice.** A credit card bill is not new spending if you already counted the card swipes.',
          '**Forgetting yearly costs.** Insurance or subscriptions paid once a year can break one cycle. Set a little aside each cycle.',
          '**Budgeting to the last rupee.** Leave a buffer. Real life is untidy.',
          '**Changing the start day often.** Pick it once so your comparisons stay fair.',
        ],
      },
      { type: 'h2', text: 'Check the plan once a week' },
      {
        type: 'p',
        text: 'A budget only works if you look at it. A two-minute weekly check is enough. Open the app on the same day each week and ask: which category is closest to its limit, and what bills fall due before payday? If a category is running hot, you can slow down there instead of cutting everything.',
      },
      {
        type: 'p',
        text: 'Another example, again with made-up numbers. Suppose your shopping limit is Rs 5,000 and you have spent Rs 4,000 by the 12th. That is 80%, the point where a nudge is useful. You can decide to pause shopping until the next cycle, or move Rs 1,000 from a category that is under-used. Either choice is fine. The point is that you chose it.',
      },
      {
        type: 'p',
        text: 'If you share costs with flatmates or family, only your own share belongs in your budget. Use a split for the rest, so a bill you paid for others does not eat your food limit.',
      },
      { type: 'cta' },
      {
        type: 'p',
        text: 'Raqm is pre-launch and Android first. To see how the transactions get in without typing, read [how to track expenses from bank SMS in India](/blog/track-expenses-from-bank-sms-in-india), or check the [download page](/download) for status.',
      },
    ],
    faq: [
      {
        q: 'What if my salary date changes month to month?',
        a: 'Pick the day it usually arrives, or use a day a little after it. Raqm accepts a start day from 1 to 28, and you can also use a fixed-length cycle instead.',
      },
      {
        q: 'Do budgets in Raqm follow my pay cycle?',
        a: 'Yes. The month-start day you set is used for budgets, alerts, analytics and exports, so they all measure the same period.',
      },
      {
        q: 'Can unused budget carry over?',
        a: 'Yes, if you opt in per category. Unspent budget from the previous period is added to the next one.',
      },
    ],
  },
  {
    slug: 'find-forgotten-subscriptions-in-bank-sms',
    title: 'Find forgotten subscriptions in your bank SMS',
    description:
      'Small monthly charges hide in plain sight. Learn how to spot forgotten subscriptions in your bank alerts, and how Raqm flags repeating charges on your phone.',
    quickAnswer:
      'Forgotten subscriptions show up as the same merchant charging a similar amount about every month. Search your bank SMS for repeating names, list them with amounts, then cancel what you no longer use. Raqm flags such repeating charges on your phone and can remind you before a renewal.',
    tag: 'How it works',
    publishedAt: '2026-11-08',
    updatedAt: '2026-11-08',
    cover: 2,
    body: [
      {
        type: 'p',
        text: 'Big bills get noticed. Small repeating ones do not. A streaming plan you stopped watching, an app you tried once, a storage upgrade: each is a small amount, so none feels worth chasing.',
      },
      {
        type: 'p',
        text: '**Added up over a year, small repeating charges can equal one big expense.** Your bank SMS already holds the evidence. The job is to line it up.',
      },
      { type: 'h2', text: 'What a subscription looks like in an SMS' },
      {
        type: 'p',
        text: 'A subscription charge has a pattern: the same merchant, a similar amount, and a gap of about a month. Here is a made-up example of two alerts from a card.',
      },
      {
        type: 'ul',
        items: [
          '"INR 199.00 spent on card XX5678 at EXAMPLEPLAY on 03-09-26"',
          '"INR 199.00 spent on card XX5678 at EXAMPLEPLAY on 03-10-26"',
        ],
      },
      {
        type: 'p',
        text: 'Same merchant, same amount, one month apart. That is the shape to look for. Rs 199 a month is Rs 2,388 over twelve months. This is only an example, but the arithmetic is worth doing for your own list.',
      },
      { type: 'h2', text: 'Finding them by hand' },
      {
        type: 'ol',
        items: [
          '**Open your messages and search for "spent", "debited" or "mandate".** Wording differs by bank.',
          '**Look at the last three months.** Write down any merchant that appears more than once.',
          '**Note the amount and the date.** Charges that land on a similar day each month are the likely subscriptions.',
          '**Check your card and UPI AutoPay lists** in the bank or UPI app for active mandates, as the SMS may not mention all of them.',
          '**Decide for each one:** keep, cancel, or switch to a cheaper plan.',
        ],
      },
      {
        type: 'p',
        text: 'This works, but it is a chore, and you will forget to repeat it. A tracker can do the first part for you.',
      },
      { type: 'h2', text: 'How Raqm flags repeating charges' },
      {
        type: 'p',
        text: 'Once Raqm has your transactions, it looks for debits to the same merchant where the amount is close to the same and the charges are roughly a month apart. When it finds that, it marks the merchant as recurring. This happens on your phone, on the same local data as the rest of the app. The rule is set out on the [smart matching page](/features/smart-matching), and [insights and analytics](/features/insights) show recurring charges next to your trends.',
      },
      {
        type: 'ul',
        items: [
          '**It needs a pattern.** A single charge is not flagged, because one payment proves nothing.',
          '**It predicts the next date.** From the usual gap between charges, it estimates when the next one is due.',
          '**It can remind you.** Reminders for charges due in the next few days can be switched on or off in notification settings.',
          '**It feeds your budget.** Bills expected soon are taken off your safe-to-spend figure.',
        ],
      },
      {
        type: 'callout',
        label: 'It is a guess',
        text: 'Automatic detection can miss a subscription whose price changes a lot, or flag a habit that is not a subscription. Treat the list as a starting point, and correct it when it is wrong.',
      },
      { type: 'h2', text: 'What to do with the list' },
      {
        type: 'ul',
        items: [
          '**Cancel what you do not use.** Do it from the service itself, as a tracker cannot cancel anything for you.',
          '**Downgrade what you barely use.** A cheaper plan may do.',
          '**Mark what you keep.** Knowing it is deliberate makes the charge easier to live with.',
          '**Plan for it.** Leave room in the right category, using [budgets that follow your pay cycle](/features/smarter-budgets).',
        ],
      },
      { type: 'h2', text: 'A monthly check is enough' },
      {
        type: 'p',
        text: 'You do not need to audit every week. Set one date, such as the day after payday, and read the recurring list once a month. If something is new, ask whether you remember agreeing to it. Then close the app and get on with your day.',
      },
      { type: 'h2', text: 'Subscriptions you may not think of' },
      {
        type: 'p',
        text: 'Streaming and music are the obvious ones. Look wider. Cloud storage, app upgrades, news, gym memberships, a language app, a domain name, a VPN, a magazine you forgot. Some are billed yearly, so they appear in your history only once. A yearly charge will not be flagged as monthly, so scan older statements for large single charges too.',
      },
      {
        type: 'p',
        text: 'Free trials deserve special care. A trial that converts to paid often bills on the day it ends. If you start one, note the end date in a reminder the same day. If it is in your messages as a small first charge, check what it turns into.',
      },
      {
        type: 'p',
        text: 'Also watch for price changes. A plan that rises from Rs 199 to Rs 249 is easy to miss. Raqm matches amounts within about 5% of each other, so a bigger jump like this one can break the pattern. Read the alert whenever an amount looks different.',
      },
      {
        type: 'p',
        text: 'One more habit is worth building. When you cancel something, keep an eye on the next month of alerts to confirm the charge really stopped. Some services keep billing for a cycle after you cancel, or restart on a different plan. A quick look a month later closes the loop.',
      },
      { type: 'cta' },
      {
        type: 'p',
        text: 'Raqm is in pre-launch on Android. To see how bank alerts become transactions, read [how to track expenses from bank SMS in India](/blog/track-expenses-from-bank-sms-in-india). Questions are answered in the [FAQ](/faq).',
      },
    ],
    faq: [
      {
        q: 'How does Raqm know a charge is a subscription?',
        a: 'It looks for debits to the same merchant with a similar amount and a gap of about a month. It is an automatic guess, so you can correct it.',
      },
      {
        q: 'Can Raqm cancel a subscription for me?',
        a: 'No. Raqm only shows and reminds you. To cancel, use the service itself or your bank or UPI app.',
      },
      {
        q: 'Do I get a reminder before a renewal?',
        a: 'Raqm can notify you about charges due in the next few days. You can turn these reminders on or off in notification settings.',
      },
    ],
  },
];
