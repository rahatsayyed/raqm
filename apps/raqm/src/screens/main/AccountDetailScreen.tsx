import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';

export function AccountDetailScreen({ route, navigation }: MainStackScreenProps<'AccountDetail'>) {
  return (
    <View style={styles.root}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{route.params.bankName}</Text>
      <Text style={styles.sub}>{route.params.last4 ? `•••• ${route.params.last4}` : 'Account'}</Text>
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
