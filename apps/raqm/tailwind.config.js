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

        // ── Extended custom (RDL) tokens ──────────────────────────────────
        'bg-surface': '#121A17',
        'bg-surface-raised': '#182420',
        'border-subtle': '#243128',
        'ink-headline': '#F4F1EA',
        'ink-body': '#A9B3AC',
        'ink-label': '#5C665F',
        'error-muted': '#C1666B',
        'moss-structure': '#7C9885',
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
      },
      // RN loads each weight as its own font file, so families are per-weight.
      fontFamily: {
        inter: ['Inter_400Regular'],
        'inter-medium': ['Inter_500Medium'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
        fraunces: ['Fraunces_500Medium'],
        mono: ['JetBrainsMono_400Regular'],
        'mono-medium': ['JetBrainsMono_500Medium'],
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
        'statement-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.64px' }],
        'statement-mobile': ['28px', { lineHeight: '34px' }],
        'metric-hero': ['44px', { lineHeight: '52px', letterSpacing: '-0.5px' }],
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
