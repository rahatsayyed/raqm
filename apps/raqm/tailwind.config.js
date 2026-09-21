/** @type {import('tailwindcss').Config} */
// Class names mirror the Stitch design-system exports (bg-surface, border-subtle,
// ink-headline, …) so Stitch HTML translates near 1:1. Values must stay in sync
// with src/theme (colors.ts / typography.ts / spacing.ts) — the theme tokens
// remain the source of truth for StyleSheet screens.
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── Material Design tokens (dark mode) — mirrors src/theme/colors.ts ──
        primary: '#75daa8',
        'on-primary': '#003823',
        'primary-container': '#52b788',
        'on-primary-container': '#00442c',
        'inverse-primary': '#006c48',
        'primary-fixed': '#92f7c3',
        'primary-fixed-dim': '#75daa8',
        'on-primary-fixed': '#002113',
        'on-primary-fixed-variant': '#005235',

        secondary: '#f2bc8f',
        'on-secondary': '#492908',
        'secondary-container': '#633e1c',
        'on-secondary-container': '#dfab80',
        'secondary-fixed': '#ffdcc1',
        'secondary-fixed-dim': '#f2bc8f',
        'on-secondary-fixed': '#2e1500',
        'on-secondary-fixed-variant': '#633e1c',

        tertiary: '#a5d0b9',
        'on-tertiary': '#0e3727',
        'tertiary-container': '#84ae98',
        'on-tertiary-container': '#1a4231',
        'tertiary-fixed': '#c1ecd4',
        'tertiary-fixed-dim': '#a5d0b9',
        'on-tertiary-fixed': '#002114',
        'on-tertiary-fixed-variant': '#274e3d',

        surface: '#0e1512',
        'surface-dim': '#0e1512',
        'surface-bright': '#333b37',
        'surface-container-lowest': '#09100d',
        'surface-container-low': '#161d1a',
        'surface-container': '#1a211e',
        'surface-container-high': '#242c28',
        'surface-container-highest': '#2f3633',
        'surface-variant': '#2f3633',
        'surface-tint': '#75daa8',
        'on-surface': '#dde4df',
        'on-surface-variant': '#bdcac0',
        'inverse-surface': '#dde4df',
        'inverse-on-surface': '#2b322e',

        background: '#0e1512',
        'on-background': '#dde4df',

        outline: '#88948b',
        'outline-variant': '#3e4942',

        error: '#ffb4ab',
        'on-error': '#690005',
        'error-container': '#93000a',
        'on-error-container': '#ffdad6',

        'hero-gradient-start': '#75daa8',
        'hero-gradient-end': '#52b788',
        'welcome-gradient-start': '#75daa8',
        'welcome-gradient-end': '#52b788',

        // ── Extended custom (RDL v2.0) tokens ─────────────────────────────
        'bg-base': '#0A0E0C',
        'bg-surface': '#10140F',
        'bg-surface-raised': '#161C15',
        'border-subtle': '#232B22',
        'ink-headline': '#F2F0E9',
        'ink-body': '#9FA89C',
        'ink-label': '#5B635A',
        'accent-primary': '#3EBD7E',
        'accent-deep': '#173325',
        notice: '#C68B4D',
        'error-muted': '#C4707A',
        // TODO(design-v2): unused post-onboarding-redesign, remove after full app migration
        'moss-structure': '#7C9885',

        // ── Onboarding-v3 tokens (light/dark) — mirrors
        // src/theme/onboardingColors.ts's OnbColors exactly. Deliberately
        // separate from the tokens above (which are the app-wide dark-only
        // scale) since onboarding is the only OS-light/dark-aware surface.
        // darkMode defaults to 'media' here (no override below), matching
        // useColorScheme()'s OS-based detection, so pair every onb-* class
        // with its dark:onb-*-dark counterpart.
        'onb-bg-base': '#F7F6F3',
        'onb-bg-base-dark': '#0B0C0E',
        'onb-bg-surface': '#FFFFFF',
        'onb-bg-surface-dark': '#15171A',
        'onb-bg-surface-raised': '#EFEDE8',
        'onb-bg-surface-raised-dark': '#1C1F23',
        'onb-border-subtle': 'rgba(20,20,20,0.08)',
        'onb-border-subtle-dark': 'rgba(255,255,255,0.12)',
        'onb-glass-bg': 'rgba(255,255,255,0.55)',
        'onb-glass-bg-dark': 'rgba(255,255,255,0.06)',
        'onb-glass-highlight': 'rgba(255,255,255,0.6)',
        'onb-glass-highlight-dark': 'rgba(255,255,255,0.08)',
        'onb-ink-headline': '#14140F',
        'onb-ink-headline-dark': '#F2F1EC',
        'onb-ink-body': '#4A4A45',
        'onb-ink-body-dark': '#B7B6AE',
        'onb-ink-label': '#8A8880',
        'onb-ink-label-dark': '#6B6A62',
        'onb-accent-primary': '#2E5D4E',
        'onb-accent-primary-dark': '#66CCAC',
        'onb-accent-deep': '#DCE9E3',
        'onb-accent-deep-dark': '#1F4A3B',
        'onb-notice': '#B8813C',
        'onb-notice-dark': '#D9A85C',
        'onb-error-muted': '#B4483A',
        'onb-error-muted-dark': '#E08672',
        'onb-on-accent': '#F7F6F3',
        'onb-on-accent-dark': '#14140F',
        'onb-dot-inactive': 'rgba(20,20,20,0.12)',
        'onb-dot-inactive-dark': 'rgba(255,255,255,0.14)',
      },
      // Named scale mirrors src/theme/spacing.ts — prefer these over arbitrary
      // px values so screens stay in sync with the theme tokens by construction.
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        xxl: '40px',
        'container-margin': '24px',
        gutter: '16px',
        'section-gap': '40px',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        '3xl': '32px',
        // Back-compat aliases already used by the Home/Timeline conversion.
        card: '12px',
        btn: '8px',
        sheet: '20px',
        // DESIGN.md v3.0 §5 radius scale — new keys only, additive: the old
        // scale above is NOT replaced app-wide (that's unscoped, separate
        // work per docs/superpowers/specs/2026-09-20-onboarding-v3-implementation-notes.md).
        // Used only by the 7 onboarding-v3 redesign screens.
        outer: '6px',
        inner: '4px',
        cta: '3px',
        dot: '1px',
      },
      // RN loads each weight as its own font file, so families are per-weight.
      fontFamily: {
        inter: ['Inter_400Regular'],
        'inter-light': ['Inter_300Light'],
        'inter-medium': ['Inter_500Medium'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
        mono: ['JetBrainsMono_400Regular'],
        'mono-medium': ['JetBrainsMono_500Medium'],
        // Loaded in App.tsx but had no token yet — needed for the onboarding-v3
        // "total monthly budget" amount (artifact weight 600).
        'mono-semibold': ['JetBrainsMono_600SemiBold'],
        // DESIGN.md v3.0 §3 — Newsreader (italic, display only) + Instrument
        // Sans (body). New families, used only by the 7 onboarding-v3
        // redesign screens; the rest of the app keeps Inter.
        'newsreader-italic': ['Newsreader_400Regular_Italic'],
        instrument: ['InstrumentSans_400Regular'],
        'instrument-medium': ['InstrumentSans_500Medium'],
        'instrument-semibold': ['InstrumentSans_600SemiBold'],
      },
      fontSize: {
        // ── Legacy Material-ish roles (src/theme/typography.ts) — pair with
        // font-inter-bold/-semibold/-inter/-mono/-mono-medium as noted per role.
        'display-lg': ['36px', { lineHeight: '44px', letterSpacing: '-0.72px' }], // font-inter-bold
        'headline-md': ['24px', { lineHeight: '32px' }], // font-inter-semibold
        'headline-sm': ['20px', { lineHeight: '28px' }], // font-inter-bold
        'title-lg': ['18px', { lineHeight: '26px' }], // font-inter-bold
        'body-lg': ['18px', { lineHeight: '28px' }], // font-inter
        'body-md': ['16px', { lineHeight: '24px' }], // font-inter
        'label-lg': ['14px', { lineHeight: '20px', letterSpacing: '0.7px' }], // font-mono-medium
        'label-sm': ['12px', { lineHeight: '16px', letterSpacing: '0.6px' }], // font-mono

        // ── RDL roles ────────────────────────────────────────────────────
        'statement-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.7px' }], // font-inter-light
        'statement-mobile': ['28px', { lineHeight: '34px', letterSpacing: '-0.6px' }], // font-inter-light
        'metric-hero': ['44px', { lineHeight: '52px', letterSpacing: '-1.0px' }],
        'section-header': ['13px', { lineHeight: '16px', letterSpacing: '1.04px' }],
        'insight-reading': ['17px', { lineHeight: '24px' }],
        'body-standard': ['15px', { lineHeight: '22px' }],
        'body-sm': ['14px', { lineHeight: '20px' }],
        'supporting-text': ['13px', { lineHeight: '18px' }],
        annotation: ['12px', { lineHeight: '16px' }],
        caption: ['11px', { lineHeight: '14px' }],
        'label-caps': ['11px', { lineHeight: '14px', letterSpacing: '0.55px' }],
        'numeric-xl': ['48px', { lineHeight: '56px', letterSpacing: '-0.5px' }],
        'numeric-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.3px' }],
        'numeric-md': ['20px', { lineHeight: '28px' }],
        'numeric-sm': ['14px', { lineHeight: '20px' }],
      },
    },
  },
  plugins: [],
};
