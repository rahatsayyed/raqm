import { Geist, JetBrains_Mono } from 'next/font/google';

export const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans-src',
  display: 'swap',
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});
