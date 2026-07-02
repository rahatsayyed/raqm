import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../../theme';

export function GroceryScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Grocery</Text>
      <Text style={styles.sub}>Your grocery lists will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background, padding: Spacing.containerMargin },
  title: { ...Typography.headlineSm, color: Colors.onSurface, marginTop: Spacing.lg },
  sub: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, marginTop: Spacing.sm },
});
