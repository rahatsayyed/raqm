import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';

interface TrustItem {
  icon: string;
  title: string;
  subtitle: string;
}

interface Props {
  iconEmoji: string;
  headline: string;
  headlineAccent?: string;
  description: string;
  trustItems: TrustItem[];
  ctaLabel: string;
  onCTA: () => void;
  skipLabel?: string;
  onSkip?: () => void;
}

export function PermissionScreen({
  iconEmoji,
  headline,
  headlineAccent,
  description,
  trustItems,
  ctaLabel,
  onCTA,
  skipLabel,
  onSkip,
}: Props) {
  const headlineParts = headlineAccent ? headline.split(headlineAccent) : [headline];

  return (
    <View style={styles.container}>
      <View style={styles.orbTopRight} />
      <View style={styles.orbBottomLeft} />

      <View style={styles.illustrationArea}>
        <View style={styles.iconGlow} />
        <View style={styles.iconContainer}>
          <View style={styles.iconInner}>
            <Text style={styles.iconText}>{iconEmoji}</Text>
          </View>
        </View>
        <View style={[styles.floatingBadge, styles.badgeTopRight]}>
          <Text style={styles.badgeEmoji}>✅</Text>
        </View>
        <View style={[styles.floatingBadge, styles.badgeBottomLeft]}>
          <Text style={styles.badgeEmoji}>🏦</Text>
        </View>
      </View>

      <View style={styles.textContent}>
        <Text style={styles.headline}>
          {headlineAccent ? (
            <>
              {headlineParts[0]}
              <Text style={styles.headlineAccent}>{headlineAccent}</Text>
              {headlineParts[1]}
            </>
          ) : (
            headline
          )}
        </Text>
        <Text style={styles.description}>{description}</Text>

        <View style={styles.trustList}>
          {trustItems.map((item, i) => (
            <View key={i} style={styles.trustItem}>
              <View style={styles.trustIconBox}>
                <Text style={styles.trustEmoji}>{item.icon}</Text>
              </View>
              <View style={styles.trustText}>
                <Text style={styles.trustTitle}>{item.title}</Text>
                <Text style={styles.trustSubtitle}>{item.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton label={ctaLabel} onPress={onCTA} style={styles.ctaButton} />
        {skipLabel && onSkip && (
          <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
            <Text style={styles.skipLabel}>{skipLabel}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.privacyRow}>
          <Text style={styles.privacyText}>🔒 Your data is never shared with third parties</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceContainerLow },
  orbTopRight: {
    position: 'absolute', top: -60, right: -60, width: 240, height: 240,
    borderRadius: 120, backgroundColor: Colors.primaryContainer, opacity: 0.15,
  },
  orbBottomLeft: {
    position: 'absolute', bottom: -60, left: -60, width: 240, height: 240,
    borderRadius: 120, backgroundColor: Colors.secondaryContainer, opacity: 0.15,
  },
  illustrationArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: Colors.primary, opacity: 0.08,
  },
  iconContainer: {
    width: 128, height: 128, borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
    transform: [{ rotate: '12deg' }],
  },
  iconInner: {
    width: 112, height: 112, borderRadius: 28,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 52 },
  floatingBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: Radius.xl, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
  },
  badgeTopRight: { top: '20%', right: '12%' },
  badgeBottomLeft: { bottom: '15%', left: '8%' },
  badgeEmoji: { fontSize: 24 },
  textContent: {
    paddingHorizontal: Spacing.containerMargin,
    paddingBottom: Spacing.xl,
  },
  headline: {
    ...Typography.displayLg,
    color: Colors.onSurface,
    marginBottom: Spacing.md,
  },
  headlineAccent: { color: Colors.primary, fontStyle: 'italic' },
  description: {
    ...Typography.bodyLg,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.xl,
  },
  trustList: { gap: Spacing.sm },
  trustItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: Radius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: `${Colors.primary}1A`,
  },
  trustIconBox: {
    width: 40, height: 40, borderRadius: Radius.lg,
    backgroundColor: `${Colors.primary}1A`,
    alignItems: 'center', justifyContent: 'center',
  },
  trustEmoji: { fontSize: 20 },
  trustText: { flex: 1 },
  trustTitle: {
    ...Typography.labelLg,
    color: Colors.onSurface,
    fontFamily: 'WorkSans_500Medium',
    fontSize: 14,
  },
  trustSubtitle: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    fontSize: 12,
    letterSpacing: 0,
  },
  footer: {
    padding: Spacing.containerMargin,
    paddingBottom: 32,
    backgroundColor: Colors.surfaceContainer,
    shadowColor: Colors.onTertiaryContainer,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06, shadowRadius: 20, elevation: 8,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    gap: Spacing.md,
  },
  ctaButton: { borderRadius: Radius.xl, height: 64 },
  skipButton: { height: 44, alignItems: 'center', justifyContent: 'center' },
  skipLabel: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
  privacyRow: { alignItems: 'center' },
  privacyText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    opacity: 0.6, letterSpacing: 0, fontSize: 11,
  },
});
