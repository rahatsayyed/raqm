import { TextStyle } from 'react-native';

export const Typography = {
  // Headlines — Manrope
  displayLg: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 36,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 44,
    letterSpacing: -0.72,
  },
  headlineMd: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 24,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 32,
  },
  headlineSm: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 28,
  },
  titleLg: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 26,
  },

  // Body — Work Sans
  bodyLg: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 18,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 28,
  },
  bodyMd: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 16,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 24,
  },
  bodySm: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 14,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 20,
  },

  // Labels — Geist (falls back to system monospace until Geist package is added)
  labelLg: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 14,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 20,
    letterSpacing: 0.7,
  },
  labelSm: {
    fontFamily: 'DMMono_400Regular',
    fontSize: 12,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 16,
    letterSpacing: 0.6,
  },

  // Numeric — DM Mono (amounts, balances, counters, OTP, stats)
  numericXl: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 48,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 56,
    letterSpacing: -0.5,
  },
  numericLg: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 32,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 40,
    letterSpacing: -0.3,
  },
  numericMd: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 20,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 28,
  },
  numericSm: {
    fontFamily: 'DMMono_400Regular',
    fontSize: 14,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 20,
  },

  // ── New tokens: Fraunces (serif) + Inter (grotesk) ──────────────────────

  statementLg: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 32,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 40,
    letterSpacing: -0.64,
  },
  statementMobile: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 28,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 34,
  },
  metricHero: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 48,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 56,
  },
  sectionHeader: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 16,
    letterSpacing: 1.04,
  },
  insightReading: {
    fontFamily: 'Inter_500Medium',
    fontSize: 17,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 24,
  },
  bodyStandard: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 22,
  },
  supportingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 18,
  },
  annotation: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 16,
  },
  labelCaps: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 14,
    letterSpacing: 0.55,
  },
} as const;
