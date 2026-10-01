import type { Metadata, Viewport } from 'next';
import { newsreader, instrumentSans, jetbrainsMono, anton } from './fonts';
import { BackgroundDepth } from '@/components/BackgroundDepth';
import { SmoothScrollProvider } from '@/components/SmoothScrollProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Raqm: know where your money goes, automatically',
  description:
    'Raqm reads your bank SMS on-device and shows you where your money goes. No bank linking, nothing leaves your phone. Join the waitlist.',
};

export const viewport: Viewport = {
  themeColor: '#F7F6F3',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${newsreader.variable} ${instrumentSans.variable} ${jetbrainsMono.variable} ${anton.variable} antialiased`}
      >
        <BackgroundDepth />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-cta focus:bg-accent-primary focus:px-4 focus:py-2 focus:font-body focus:text-sm focus:font-medium focus:text-[var(--color-surface)]"
        >
          Skip to main content
        </a>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
