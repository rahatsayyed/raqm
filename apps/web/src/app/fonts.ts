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

// Scoped to FlagshipStripVertical's feature-name headings — a free match for the reference site's display face.
export const anton = Anton({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-anton',
  display: 'swap',
});
