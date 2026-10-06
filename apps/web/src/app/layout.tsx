import type { Metadata, Viewport } from 'next';
import { newsreader, instrumentSans, jetbrainsMono, anton, caveat } from './fonts';
import { BackgroundDepth } from '@/components/BackgroundDepth';
import { SmoothScrollProvider } from '@/components/SmoothScrollProvider';
import { IntroScreen } from '@/components/IntroScreen';
import './globals.css';

const INTRO_GATE = `try{var d=document.documentElement,s=matchMedia('(prefers-reduced-motion: reduce)').matches||location.pathname!=='/'||location.hash||sessionStorage.getItem('raqm-intro')==='1';d.dataset.intro=s?'skip':'play'}catch(e){document.documentElement.dataset.intro='skip'}`;

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_GATE }} />
        <noscript>
          <style>{'.intro-overlay{display:none}'}</style>
        </noscript>
      </head>
      <body
        className={`${newsreader.variable} ${instrumentSans.variable} ${jetbrainsMono.variable} ${anton.variable} ${caveat.variable} antialiased`}
      >
        <IntroScreen />
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
