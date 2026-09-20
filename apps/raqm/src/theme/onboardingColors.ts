import { useColorScheme } from 'react-native';

// Color tokens for the onboarding-v3 redesign screens ONLY (Welcome,
// Permissions, Scan range, Scanning progress, Scan complete, Budget setup,
// Setup complete) — deliberately scoped so the rest of the app (still
// dark-only per DESIGN.md's app-wide scope) is unaffected. Dark values are
// DESIGN.md v3.0 §2's locked palette (re-derived from the claude-design
// exploration); light values are new — this app never had a light mode
// before, so these are read straight off the mockup's light-mode screens
// (docs/superpowers/specs/2026-09-16-onboarding-redesign-design.md,
// the claude-design canvas's *-Light.dc.html files) with a few tiers
// (bgSurfaceRaised, accentDeep, inkLabel, errorMuted) derived at the same
// ratio as their dark counterparts, since the mockup only fixed a handful
// of values per screen, not a full token scale, mirroring how DESIGN.md
// itself extends the v3.0 dark scale for tokens the exploration didn't spell out.
export type OnbScheme = 'light' | 'dark';

export const OnbColors = {
  dark: {
    bgBase: '#0B0C0E',
    bgSurface: '#15171A',
    bgSurfaceRaised: '#1C1F23',
    borderSubtle: 'rgba(255,255,255,0.12)',
    glassBg: 'rgba(255,255,255,0.06)',
    glassHighlight: 'rgba(255,255,255,0.08)',
    inkHeadline: '#F2F1EC',
    inkBody: '#B7B6AE',
    inkLabel: '#6B6A62',
    accentPrimary: '#66CCAC',
    accentDeep: '#1F4A3B',
    notice: '#D9A85C',
    errorMuted: '#E08672',
    onAccent: '#14140F',
    dotInactive: 'rgba(255,255,255,0.14)',
  },
  light: {
    bgBase: '#F7F6F3',
    bgSurface: '#FFFFFF',
    // Derived: one step down from bg-surface, same ratio the dark side uses
    // for bg-surface-raised (nested cards/modals) — the mockup only shows
    // flat white cards, never a nested one.
    bgSurfaceRaised: '#EFEDE8',
    borderSubtle: 'rgba(20,20,20,0.08)',
    glassBg: 'rgba(255,255,255,0.55)',
    glassHighlight: 'rgba(255,255,255,0.6)',
    inkHeadline: '#14140F',
    inkBody: '#4A4A45',
    // Derived: no third text tier appears in the light mockup screens;
    // kept at the same body/label contrast ratio as the dark tokens.
    inkLabel: '#8A8880',
    accentPrimary: '#2E5D4E',
    // Derived: same hue as accentPrimary, low-lightness structural tint —
    // mirrors how dark accentDeep relates to dark accentPrimary.
    accentDeep: '#DCE9E3',
    notice: '#B8813C',
    // From implementation-notes.md §3: "#B4483A (light)" is the one light
    // value the exploration did fix directly.
    errorMuted: '#B4483A',
    onAccent: '#F7F6F3',
    dotInactive: 'rgba(20,20,20,0.12)',
  },
} as const;

// Defaults to the OS appearance setting via RN's own useColorScheme — no
// in-app toggle, per this task's explicit requirement.
export function useOnbColors() {
  const scheme: OnbScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, colors: OnbColors[scheme] } as const;
}
