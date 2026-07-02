import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';

export function AddTransactionScreen({ navigation }: MainStackScreenProps<'AddTransaction'>) {
  return (
    <View style={styles.root}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>✕ Close</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Add Transaction</Text>
      <Text style={styles.sub}>Manual entry form — coming in Plan 2.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background, padding: Spacing.containerMargin },
  back: { marginTop: Spacing.lg },
  backText: { ...Typography.bodyMd, color: Colors.primary },
  title: { ...Typography.headlineSm, color: Colors.onSurface, marginTop: Spacing.md },
  sub: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, marginTop: Spacing.sm },
});
