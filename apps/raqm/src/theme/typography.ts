import { TextStyle } from 'react-native';

// Raqm Design Language — finalized font stack:
//   Fraunces  → headlines/statements only (Statement roles)
//   Inter     → everything else (titles, body, labels, section headers)
//   JetBrains Mono → every number/amount (Metric + numeric roles)
export const Typography = {
  // Headlines — Inter
  displayLg: {
    fontFamily: 'Inter_700Bold',
    fontSize: 36,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 44,
    letterSpacing: -0.72,
  },
  headlineMd: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 24,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 32,
  },
  headlineSm: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 28,
  },
  titleLg: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 26,
  },

  // Body — Inter
  bodyLg: {
    fontFamily: 'Inter_400Regular',
    fontSize: 18,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 28,
  },
  bodyMd: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 24,
  },
  bodySm: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 20,
  },

  // Labels — JetBrains Mono (data-adjacent labels: badges, codes)
  labelLg: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 14,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 20,
    letterSpacing: 0.7,
  },
  labelSm: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 16,
    letterSpacing: 0.6,
  },

  // Numeric — JetBrains Mono (amounts, balances, counters, OTP, stats)
  numericXl: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 48,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 56,
    letterSpacing: -0.5,
  },
  numericLg: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 32,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 40,
    letterSpacing: -0.3,
  },
  numericMd: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 20,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 28,
  },
  numericSm: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 14,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 20,
  },

  // ── RDL roles: Fraunces (statements) + Inter (function) + Mono (metrics) ──

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
  // Metric role — hero amounts are numbers, so they carry the mono voice.
  metricHero: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 44,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 52,
    letterSpacing: -0.5,
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
