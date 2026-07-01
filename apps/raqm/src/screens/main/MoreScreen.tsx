import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useAppStore } from '../../store/appStore';
import { useOnboardingStore } from '../../store/onboardingStore';

interface RowProps {
  icon: string;
  label: string;
  onPress?: () => void;
  destructive?: boolean;
}

function Row({ icon, label, onPress, destructive }: RowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, destructive && styles.rowIconDestructive]}>
        <Text style={styles.rowIconText}>{icon}</Text>
      </View>
      <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</Text>
      <Text style={styles.rowChevron}>›</Text>
    </TouchableOpacity>
  );
}

export function MoreScreen() {
  const { userName } = useAppStore();
  const { transactions } = useOnboardingStore();

  const firstName = userName.trim().split(' ')[0] || 'User';

  return (
    <View style={styles.root}>
      <Text style={styles.pageTitle}>More</Text>

      {/* Profile card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{firstName[0].toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.profileName}>{userName || 'User'}</Text>
          <Text style={styles.profileMeta}>{transactions.length} transactions scanned</Text>
        </View>
      </View>

      {/* Data section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>DATA</Text>
        <View style={styles.card}>
          <Row icon="🔄" label="Re-scan SMS" />
          <View style={styles.sep} />
          <Row icon="📤" label="Export transactions" />
        </View>
      </View>

      {/* App section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>APP</Text>
        <View style={styles.card}>
          <Row icon="🔔" label="Notification settings" />
          <View style={styles.sep} />
          <Row icon="📍" label="Location permissions" />
          <View style={styles.sep} />
          <Row icon="ℹ️" label="About Raqm" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  pageTitle: {
    ...Typography.headlineSm, color: Colors.onSurface,
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
  },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    marginHorizontal: Spacing.containerMargin,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...Typography.headlineSm, color: Colors.onPrimaryContainer, fontSize: 22 },
  profileName: { ...Typography.titleLg, color: Colors.onSurface },
  profileMeta: { ...Typography.bodySm, color: Colors.onSurfaceVariant, marginTop: 2 },

  section: { marginHorizontal: Spacing.containerMargin, marginBottom: Spacing.lg },
  sectionLabel: {
    ...Typography.labelSm, color: Colors.onSurfaceVariant,
    marginBottom: Spacing.sm, marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  rowIcon: {
    width: 36, height: 36, borderRadius: Radius.md,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center', justifyContent: 'center',
  },
  rowIconDestructive: { backgroundColor: `${Colors.error}15` },
  rowIconText: { fontSize: 18 },
  rowLabel: { ...Typography.bodyMd, color: Colors.onSurface, flex: 1 },
  rowLabelDestructive: { color: Colors.error },
  rowChevron: { fontSize: 20, color: Colors.outline, lineHeight: 24 },
  sep: { height: 1, backgroundColor: Colors.outlineVariant, marginLeft: 56 },
});
