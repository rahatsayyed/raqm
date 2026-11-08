export type ToolSlug =
  | 'emi'
  | 'sip'
  | 'compound-interest'
  | 'split-bill'
  | 'emergency-fund'
  | 'budget-50-30-20';

export type ToolDef = {
  slug: ToolSlug;
  name: string;
  chip: string;
  summary: string;
  seoTitle: string;
  seoDescription: string;
  lead: string;
  howTo: { title: string; body: string }[];
  article: { h: string; p: string[] }[];
  faq: { q: string; a: string }[];
  related: [ToolSlug, ToolSlug];
};

export const TOOLS: ToolDef[] = [
  {
    slug: 'emi',
    name: 'EMI calculator',
    chip: 'Loans',
    summary: 'See your monthly instalment, total interest and a year-by-year repayment plan for any loan.',
    seoTitle: 'EMI Calculator: monthly loan instalment in rupees',
    seoDescription:
      'Free EMI calculator for home, car and personal loans. Enter amount, rate and tenure to see your monthly EMI, total interest and yearly repayment schedule.',
    lead: 'Work out the monthly instalment on a home, car or personal loan, and see how much of what you pay is interest.',
    howTo: [
      { title: 'Enter the loan', body: 'Put in the amount you plan to borrow and the yearly interest rate your bank quotes.' },
      { title: 'Choose the tenure', body: 'Pick years or months. A longer tenure lowers the EMI but raises the total interest.' },
      { title: 'Read the result', body: 'Your EMI, the interest you pay over the full term and the balance left each year appear instantly.' },
    ],
    article: [
      {
        h: 'How an EMI is worked out',
        p: [
          'An EMI (equated monthly instalment) is a fixed payment that clears a loan in equal monthly steps. Each payment has two parts: interest on the balance still owed, and a slice of the principal. Early on, most of the payment is interest. Later, most of it is principal.',
          'This calculator uses the standard reducing-balance formula with the rate you enter divided by twelve. Interest is rounded to the paisa every month, so the schedule adds up exactly and the last instalment absorbs any rounding.',
        ],
      },
      {
        h: 'What moves the number most',
        p: [
          'Tenure matters more than most people expect. Stretching a loan from 15 to 25 years makes the EMI look lighter, yet the total interest can rise by a large margin. Try both and compare the interest figure, not just the EMI.',
          'Even a small rate change adds up over a long loan. Run the same amount at two rates to see what a negotiated cut is worth to you.',
        ],
      },
      {
        h: 'Fit the EMI into your month',
        p: [
          'A loan is easier to carry when you know your real monthly spending first. Once the EMI is in your budget, tracking where the rest of the month goes shows how much room you have left.',
        ],
      },
    ],
    faq: [
      { q: 'Is the interest rate nominal or effective?', a: 'Nominal, the way banks quote loan rates. The calculator divides it by 12 for the monthly rate.' },
      { q: 'Does this include processing fees or insurance?', a: 'No. It covers principal and interest only. Add fees separately when you compare offers.' },
      { q: 'Why does the first year show so much interest?', a: 'Interest is charged on the outstanding balance, which is highest at the start. As the balance falls, more of each EMI goes to principal.' },
      { q: 'What about floating rates or part-prepayments?', a: 'This tool assumes one fixed rate and no prepayments, so treat it as a planning estimate. Your lender statement is the final word.' },
    ],
    related: ['sip', 'budget-50-30-20'],
  },
  {
    slug: 'sip',
    name: 'SIP calculator',
    chip: 'Investing',
    summary: 'Estimate what a monthly investment could grow to over the years at an assumed return.',
    seoTitle: 'SIP Calculator: future value of monthly investing',
    seoDescription:
      'Free SIP calculator. Enter a monthly amount, expected yearly return and years to estimate your corpus, total invested and gains, with a year-by-year chart.',
    lead: 'Estimate the value of a monthly SIP at an assumed yearly return. A planning aid, not a promise.',
    howTo: [
      { title: 'Set your monthly amount', body: 'Enter what you plan to invest each month.' },
      { title: 'Assume a return and a time', body: 'Pick an expected yearly return and how many years you will stay invested.' },
      { title: 'Compare invested and grown', body: 'The chart shows your contributions against the estimated value, year by year.' },
    ],
    article: [
      {
        h: 'What a SIP calculator tells you',
        p: [
          'A systematic investment plan puts the same amount in every month. Because each instalment starts earning from the day it goes in, early months have more time to grow than later ones. The calculator adds up that growth for you.',
          'The return you enter is an assumption. Real markets move up and down, so actual results will differ. Use the number to compare plans, such as 5,000 versus 7,500 a month, not to predict a final amount.',
        ],
      },
      {
        h: 'How the figures are calculated',
        p: [
          'The yearly return is treated as an effective rate and converted to a monthly rate. Deposits are made at the end of each month by default, or at the start if you switch the option, which gives each deposit one extra month of growth.',
          'Invested amount is simply your monthly sum times the number of months. Gains are the estimated value minus that amount. Taxes, fees and inflation are not included.',
        ],
      },
      {
        h: 'Time is the biggest lever',
        p: [
          'Moving the years slider usually changes the result more than moving the monthly amount. Starting a few years earlier often beats a modest increase in the instalment.',
        ],
      },
    ],
    faq: [
      { q: 'Is the return guaranteed?', a: 'No. It is only an assumption you choose. Markets are uncertain and past performance does not fix future results.' },
      { q: 'Are taxes and fund charges included?', a: 'No. Treat the result as before tax and before costs.' },
      { q: 'What is the difference from compound interest?', a: 'A SIP is regular deposits. The compound interest tool also lets you add a starting lump sum.' },
      { q: 'Can I step up my SIP every year?', a: 'Not in this version. Work in the current monthly amount and rerun it when your income changes.' },
    ],
    related: ['compound-interest', 'emi'],
  },
  {
    slug: 'compound-interest',
    name: 'Compound interest calculator',
    chip: 'Savings',
    summary: 'Grow a lump sum with optional monthly deposits and watch interest build on interest.',
    seoTitle: 'Compound Interest Calculator: lump sum and monthly deposits',
    seoDescription:
      'Free compound interest calculator. Add a starting amount, optional monthly deposits, a yearly effective rate and years to see growth and a yearly table.',
    lead: 'See how a starting amount and regular deposits grow when interest keeps earning interest.',
    howTo: [
      { title: 'Start with what you have', body: 'Enter a lump sum, a monthly deposit, or both.' },
      { title: 'Set rate and time', body: 'Enter the effective yearly rate and the number of years.' },
      { title: 'Study the growth', body: 'Check final balance, interest earned and the yearly table underneath.' },
    ],
    article: [
      {
        h: 'Interest on interest',
        p: [
          'Simple interest pays only on the original amount. Compound interest pays on the amount plus everything earned so far, so growth speeds up the longer you wait.',
          'The calculator works month by month, adds your deposit, and rolls the result into yearly rows so you can see the curve bend.',
        ],
      },
      {
        h: 'Effective rate, not nominal',
        p: [
          'The rate here is an effective yearly rate: put in 10 and the balance grows by exactly 10 percent over twelve months. Some banks quote a nominal rate compounded quarterly or monthly, which works out slightly different. Convert to the effective rate before comparing.',
        ],
      },
      {
        h: 'Reading the result',
        p: [
          'Interest share tells you how much of the final balance came from growth rather than your own money. When it passes half, your savings are doing more of the work than you are.',
        ],
      },
    ],
    faq: [
      { q: 'What does effective rate mean?', a: 'It is the real yearly growth after compounding. An effective 10 percent turns 100 into 110 in one year.' },
      { q: 'Are deposits at the start or end of the month?', a: 'You can choose. Start-of-month deposits earn one extra month of interest.' },
      { q: 'Are tax and inflation included?', a: 'No. The figures are before tax and in future rupees.' },
      { q: 'Can I use a negative rate?', a: 'Rates must be zero or above in this tool.' },
    ],
    related: ['sip', 'emergency-fund'],
  },
  {
    slug: 'split-bill',
    name: 'Split bill calculator',
    chip: 'Groups',
    summary: 'Divide a bill evenly or by what each person ordered, with tip and fees shared fairly.',
    seoTitle: 'Split Bill Calculator: share a bill fairly in rupees',
    seoDescription:
      'Free split bill calculator. Split a bill equally or by item, add tip and extra charges, and see exactly what each person owes, down to the paisa.',
    lead: 'Split a restaurant bill, a trip or a shared flat expense, even or by item, with every paisa accounted for.',
    howTo: [
      { title: 'Choose how to split', body: 'Equal is quickest. By item lets each person pay only for what they had.' },
      { title: 'Add the amounts', body: 'Enter the total, or list the items and tick who shared each one. Add a tip and any fixed fees.' },
      { title: 'Share the result', body: 'Everyone sees their share. Copy the link to send the same split to the group.' },
    ],
    article: [
      {
        h: 'Fair, down to the paisa',
        p: [
          'Dividing 1,000 by 3 leaves a paisa nobody wants to own. This calculator hands the leftover paisa out one at a time, so every share adds up to the exact bill with no rounding gaps.',
        ],
      },
      {
        h: 'Equal versus by item',
        p: [
          'Equal split suits shared meals and group trips. When one person had a starter and another skipped dessert, by item is fairer: each dish is divided only among the people who shared it.',
          'Tip follows what each person ordered, so a bigger order carries a bigger tip. Fixed extras such as a service fee are split evenly.',
        ],
      },
      {
        h: 'Keep track after the dinner',
        p: [
          'A shared bill is easy to settle on the night and easy to forget later. Noting who owes what keeps the group relaxed.',
        ],
      },
    ],
    faq: [
      { q: 'Is the link private?', a: 'The split is stored in the part of the link after the # sign, which browsers never send to a server.' },
      { q: 'Who pays the extra paisa on an uneven split?', a: 'The first people in the list, one paisa each, so totals always match.' },
      { q: 'Does tip apply to fees?', a: 'No. Tip is a percentage of the item subtotal. Fees are added separately and shared evenly.' },
      { q: 'How many people and items can I add?', a: 'Up to 12 people and 25 items, which covers most outings.' },
    ],
    related: ['budget-50-30-20', 'emergency-fund'],
  },
  {
    slug: 'emergency-fund',
    name: 'Emergency fund calculator',
    chip: 'Safety net',
    summary: 'Find your target cushion and how many months of saving it takes to get there.',
    seoTitle: 'Emergency Fund Calculator: how much to keep aside',
    seoDescription:
      'Free emergency fund calculator. Enter monthly essentials and months of cover to get your target, the gap and how long it takes to save it.',
    lead: 'Know how big your safety net should be, and how long it takes to build at your pace.',
    howTo: [
      { title: 'Add your essentials', body: 'Rent, food, bills, EMIs and insurance: what you must pay every month.' },
      { title: 'Pick months of cover', body: 'Three to six months is common. Choose more if your income is irregular.' },
      { title: 'Plan the saving', body: 'Enter what you have saved and what you can add monthly to see the finish line.' },
    ],
    article: [
      {
        h: 'What counts as an emergency fund',
        p: [
          'It is money set aside for shocks: a job gap, a medical bill, an urgent repair. It should be easy to reach and kept separate from spending money.',
        ],
      },
      {
        h: 'How much is enough',
        p: [
          'The target here is simple: monthly essentials times the months of cover you choose. Salaried people with stable work often pick three to six months. Freelancers or single-income households may feel safer with nine or twelve.',
          'Count only needs. Leaving out dining out and subscriptions keeps the target realistic and reachable.',
        ],
      },
      {
        h: 'Build it in small steps',
        p: [
          'A big number can feel far away. The months-to-goal figure turns it into a plan: a steady monthly amount, even a small one, gets you there.',
        ],
      },
    ],
    faq: [
      { q: 'Should I include my EMIs?', a: 'Yes. Loan instalments are due even in an emergency, so they belong in essentials.' },
      { q: 'Where should I keep the fund?', a: 'Somewhere safe and quick to access, such as a savings account. This tool does not give investment advice.' },
      { q: 'Does the estimate include interest?', a: 'No. It assumes you add the same amount each month with no returns, which keeps the plan conservative.' },
      { q: 'What if I use some of it?', a: 'Update the saved amount and the tool shows the new gap.' },
    ],
    related: ['budget-50-30-20', 'sip'],
  },
  {
    slug: 'budget-50-30-20',
    name: '50/30/20 budget calculator',
    chip: 'Budgeting',
    summary: 'Split take-home pay into needs, wants and savings with a simple rule of thumb.',
    seoTitle: '50/30/20 Budget Calculator: needs, wants and savings',
    seoDescription:
      'Free 50/30/20 budget calculator. Enter your monthly take-home pay to see what to spend on needs, wants and savings, with other ratios to try.',
    lead: 'Turn your monthly take-home pay into a clear plan for needs, wants and savings.',
    howTo: [
      { title: 'Enter take-home pay', body: 'Use the amount that actually lands in your account each month.' },
      { title: 'Pick a ratio', body: 'Start with 50/30/20, or try a tighter or more ambitious split.' },
      { title: 'Compare with real spending', body: 'Use the monthly and yearly amounts as targets, then check them against what you actually spend.' },
    ],
    article: [
      {
        h: 'The rule in one line',
        p: [
          'Half of your take-home pay goes to needs, thirty percent to wants and twenty percent to savings or debt repayment. It is a starting point, not a law.',
        ],
      },
      {
        h: 'Needs, wants and savings',
        p: [
          'Needs are what you must pay: rent, groceries, utilities, transport, minimum loan payments. Wants are what you choose: eating out, trips, gadgets. Savings cover investments, your emergency fund and extra loan payments.',
          'In expensive cities, needs may take more than half. That is fine. Try the 60/20/20 option and adjust to your life.',
        ],
      },
      {
        h: 'Targets only help if you can see reality',
        p: [
          'A plan is useful once you compare it with real numbers. Seeing actual spend by category shows which bucket is running over, and that is where small changes pay off.',
        ],
      },
    ],
    faq: [
      { q: 'Should I use gross or take-home pay?', a: 'Take-home pay, after tax and deductions. It is the money you can actually allocate.' },
      { q: 'Where do EMIs go?', a: 'Required loan payments are needs. Extra payments above the minimum can count as savings.' },
      { q: 'Is 50/30/20 right for everyone?', a: 'No. It suits a middle-income, stable month. Adjust the ratio for your costs and goals.' },
      { q: 'Why do the parts always add up?', a: 'The last paisa is assigned by largest remainder, so needs, wants and savings equal your income exactly.' },
    ],
    related: ['emergency-fund', 'split-bill'],
  },
];

export const TOOL_SLUGS = TOOLS.map((t) => t.slug);

export function getTool(slug: string): ToolDef | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
