import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';

export function NameEntryScreen({ navigation }: OnboardingScreenProps<'NameEntry'>) {
  const [name, setName] = useState('');
  const inputRef = useRef<TextInput>(null);

  const firstName = name.trim().split(' ')[0];
  const isValid = name.trim().length >= 2;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <View style={styles.top}>
          <Text style={styles.wave}>👋</Text>
          <Text style={styles.headline}>
            {firstName ? `Hey, ${firstName}!` : "What's your name?"}
          </Text>
          <Text style={styles.subtitle}>
            We'll use your name to personalize your experience.
          </Text>
        </View>

        <View style={styles.inputArea}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Your full name"
            placeholderTextColor={Colors.outline}
            value={name}
            onChangeText={setName}
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => isValid && navigation.popToTop()}
          />
          <View style={[styles.underline, name.length > 0 && styles.underlineActive]} />
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            label={isValid ? `Continue as ${firstName}` : 'Continue'}
            onPress={() => navigation.popToTop()}
            disabled={!isValid}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  inner: { flex: 1, paddingHorizontal: Spacing.containerMargin, justifyContent: 'space-between', paddingTop: 80, paddingBottom: 40 },
  top: { gap: Spacing.md },
  wave: { fontSize: 48 },
  headline: { ...Typography.displayLg, color: Colors.onSurface },
  subtitle: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, lineHeight: 24, maxWidth: 280 },
  inputArea: { gap: 4 },
  input: {
    fontSize: 28, fontFamily: 'Manrope_700Bold',
    color: Colors.onSurface, paddingBottom: 8,
    minHeight: 48,
  },
  underline: { height: 2, backgroundColor: Colors.outlineVariant, borderRadius: 1 },
  underlineActive: { backgroundColor: Colors.primary },
  footer: {},
});
