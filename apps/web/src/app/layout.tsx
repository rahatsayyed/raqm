import type { Metadata, Viewport } from 'next';
import { geist, jetbrainsMono } from './fonts';
import { ACTIVE_PALETTE } from '@/styles/palette.config';
import dynamic from 'next/dynamic';
import { BackgroundDepth } from '@/components/BackgroundDepth';
import { SmoothScrollProvider } from '@/components/SmoothScrollProvider';
import { IntroScreen } from '@/components/IntroScreen';
import { SiteHeader } from '@/components/SiteHeader';
import { Footer } from '@/components/Footer';
import { SITE_URL } from '@/content/site';
import './globals.css';

const PaletteSwitcher =
  process.env.NODE_ENV === 'production'
    ? null
    : dynamic(() => import('@/components/PaletteSwitcher').then((m) => m.PaletteSwitcher));

const INTRO_GATE = `try{var d=document.documentElement,s=matchMedia('(prefers-reduced-motion: reduce)').matches||location.pathname!=='/'||location.hash||sessionStorage.getItem('raqm-intro')==='1';d.dataset.intro=s?'skip':'play'}catch(e){document.documentElement.dataset.intro='skip'}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Raqm: know where your money goes, automatically',
  description:
    'Raqm reads your bank SMS on-device and shows you where your money goes. No bank linking, nothing leaves your phone. Join the waitlist.',
};

export const viewport: Viewport = {
  themeColor: '#F7F6F3',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-palette={ACTIVE_PALETTE}
      className={`${geist.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_GATE }} />
        <noscript>
          <style>{'.intro-overlay{display:none}'}</style>
        </noscript>
      </head>
      <body className="antialiased">
        <IntroScreen />
        <BackgroundDepth />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-pill focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-ink"
        >
          Skip to main content
        </a>
        <SmoothScrollProvider>
          <SiteHeader />
          {children}
          <Footer />
        </SmoothScrollProvider>
        {PaletteSwitcher && <PaletteSwitcher />}
      </body>
    </html>
  );
}
