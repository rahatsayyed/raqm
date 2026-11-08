import { FAQ_GROUPS, type FaqItem } from '@/content/faq';

const FEATURED_QUESTIONS = [
  'What is Raqm?',
  'Does my data leave my phone?',
  'Do I need an account?',
  'Which phones does it support?',
  'Why does Raqm need SMS permission?',
  'Is Raqm available to download?',
];

const ALL = FAQ_GROUPS.flatMap((g) => g.items);

export const FEATURED_FAQS: FaqItem[] = FEATURED_QUESTIONS.map((q) => ALL.find((i) => i.q === q)).filter((i): i is FaqItem => !!i);
