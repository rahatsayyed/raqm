import type { Metadata } from 'next';
import { newsreader, instrumentSans, jetbrainsMono } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Raqm — know where your money goes, automatically',
  description:
    'Raqm reads your bank SMS on-device and shows you where your money goes — no bank linking, nothing leaves your phone. Join the waitlist.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${newsreader.variable} ${instrumentSans.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
