import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Plain twMerge only recognizes Tailwind's default font-size scale, so our
// custom fontSize keys (below, kept in sync with tailwind.config.js) fall
// back into the text-color group and get dropped when combined with a
// text-* color class.
const customFontSizes = [
  'display-lg', 'headline-md', 'headline-sm', 'title-lg', 'body-lg', 'body-md',
  'label-lg', 'label-sm', 'statement-lg', 'statement-mobile', 'metric-hero',
  'section-header', 'insight-reading', 'body-standard', 'body-sm', 'supporting-text',
  'annotation', 'caption', 'label-caps', 'numeric-xl', 'numeric-lg', 'numeric-md', 'numeric-sm',
];
const twMerge = extendTailwindMerge({
  extend: { theme: { text: customFontSizes } },
});


export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
