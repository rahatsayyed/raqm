import { Newsreader, Instrument_Sans, JetBrains_Mono, Anton } from 'next/font/google';

export const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['italic'],
  weight: ['400'],
  variable: '--font-newsreader',
  display: 'swap',
});

export const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-instrument-sans',
  display: 'swap',
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

// Scoped to the FlagshipStripVertical feature-name headings only — a close free match for
// hauntedbouldercity.com's self-hosted "Display" condensed-grotesk face (bold, upright, all-caps).
// Not part of DESIGN.md's type system; doesn't replace Newsreader as the site's display font.
export const anton = Anton({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-anton',
  display: 'swap',
});
