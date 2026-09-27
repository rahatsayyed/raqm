import { Newsreader, Instrument_Sans, JetBrains_Mono } from 'next/font/google';

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
