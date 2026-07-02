import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';

export function TransactionDetailScreen({ route, navigation }: MainStackScreenProps<'TransactionDetail'>) {
  return (
    <View style={styles.root}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Transaction Detail</Text>
      <Text style={styles.sub}>ID: {route.params.transactionId}</Text>
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
