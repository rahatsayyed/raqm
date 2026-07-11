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
        background: '#0e1512',
        surface: '#0e1512',
        'surface-variant': '#2f3633',
        'surface-container-high': '#242c28',
        'on-surface': '#dde4df',
        'on-surface-variant': '#bdcac0',
        'bg-surface': '#121A17',
        'bg-surface-raised': '#182420',
        'border-subtle': '#243128',
        'ink-headline': '#F4F1EA',
        'ink-body': '#A9B3AC',
        'ink-label': '#5C665F',
        primary: '#75daa8',
        'on-primary': '#003823',
        'primary-container': '#52b788',
        'on-primary-container': '#00442c',
        secondary: '#f2bc8f',
        'error-muted': '#C1666B',
        'moss-structure': '#7C9885',
      },
      spacing: {
        'margin-mobile': '20px',
        unit: '8px',
        gutter: '16px',
      },
      borderRadius: {
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
        'statement-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.64px' }],
        'statement-mobile': ['28px', { lineHeight: '34px' }],
        'metric-hero': ['44px', { lineHeight: '52px', letterSpacing: '-0.5px' }],
        'section-header': ['13px', { lineHeight: '16px', letterSpacing: '1.04px' }],
        'insight-reading': ['17px', { lineHeight: '24px' }],
        'body-standard': ['15px', { lineHeight: '22px' }],
        'supporting-text': ['13px', { lineHeight: '18px' }],
        annotation: ['12px', { lineHeight: '16px' }],
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
