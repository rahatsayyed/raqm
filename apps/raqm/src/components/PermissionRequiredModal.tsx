import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, BackHandler, Linking } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../theme';

interface Props {
  visible: boolean;
  permissionName: string;
  reason: string;
  isPermanentlyDenied: boolean;
  onGrantPress: () => void;
  onDismiss: () => void;
}

export function PermissionRequiredModal({
  visible,
  permissionName,
  reason,
  isPermanentlyDenied,
  onGrantPress,
  onDismiss,
}: Props) {
  const handleExit = () => {
    onDismiss();
    BackHandler.exitApp();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.iconRow}>
            <View style={styles.iconBadge}>
              <Text style={styles.iconEmoji}>⚠️</Text>
            </View>
          </View>

          <Text style={styles.title}>Permission Required</Text>
          <Text style={styles.permName}>{permissionName}</Text>
          <Text style={styles.body}>{reason}</Text>

          {isPermanentlyDenied && (
            <View style={styles.settingsHint}>
              <Text style={styles.settingsHintText}>
                You previously denied this permanently. Open Settings to grant it manually.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={isPermanentlyDenied ? () => Linking.openSettings() : onGrantPress}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnLabel}>
              {isPermanentlyDenied ? 'Open Settings' : 'Grant Permission'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exitBtn} onPress={handleExit} activeOpacity={0.7}>
            <Text style={styles.exitBtnLabel}>Exit App</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.containerMargin,
    paddingBottom: 40,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconRow: { marginBottom: Spacing.sm },
  iconBadge: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.errorContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  iconEmoji: { fontSize: 30 },
  title: {
    ...Typography.titleLg,
    color: Colors.onSurface,
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 20,
  },
  permName: {
    ...Typography.labelLg,
    color: Colors.error,
    fontFamily: 'WorkSans_500Medium',
    fontSize: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  body: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: Spacing.xs,
  },
  settingsHint: {
    backgroundColor: Colors.errorContainer,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.xs,
    width: '100%',
  },
  settingsHintText: {
    ...Typography.bodySm,
    color: Colors.onErrorContainer,
    textAlign: 'center',
    lineHeight: 18,
  },
  primaryBtn: {
    width: '100%',
    height: 56,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  primaryBtnLabel: {
    ...Typography.labelLg,
    color: Colors.onPrimary,
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 16,
    letterSpacing: 0,
  },
  exitBtn: {
    width: '100%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitBtnLabel: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
});
