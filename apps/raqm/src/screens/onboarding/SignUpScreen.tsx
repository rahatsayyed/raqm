import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { GhostButton } from '../../components/GhostButton';

export function SignUpScreen({ navigation }: OnboardingScreenProps<'SignUp'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  const isValid = email.includes('@') && password.length >= 8;

  const handleContinue = () => {
    navigation.navigate('OTPVerification', { email });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>رقم</Text>
          </View>
          <Text style={styles.headline}>Create your account</Text>
          <Text style={styles.subtitle}>Sync your data across devices and never lose your history.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={[styles.input, focusedField === 'email' && styles.inputFocused]}
              placeholder="you@example.com"
              placeholderTextColor={Colors.outline}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={[styles.inputRow, focusedField === 'password' && styles.inputFocused]}>
              <TextInput
                style={styles.inputInner}
                placeholder="Min. 8 characters"
                placeholderTextColor={Colors.outline}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.eyeBtn}>
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <PrimaryButton
            label="Continue"
            onPress={handleContinue}
            disabled={!isValid}
            style={styles.ctaButton}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <GhostButton label="Skip — keep data local only" onPress={() => navigation.navigate('NameEntry')} />
        </View>

        <Text style={styles.terms}>
          By continuing you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.containerMargin, paddingTop: 56, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: Spacing.xxl, gap: Spacing.md },
  logoBadge: {
    width: 64, height: 64, borderRadius: Radius.xl,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  logoText: { fontSize: 24, color: '#fff', fontFamily: 'Manrope_700Bold' },
  headline: { ...Typography.headlineMd, color: Colors.onSurface, textAlign: 'center' },
  subtitle: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', maxWidth: 280, lineHeight: 22 },
  form: { gap: Spacing.md },
  fieldGroup: { gap: 8 },
  fieldLabel: { ...Typography.labelLg, color: Colors.onSurfaceVariant, fontSize: 13, letterSpacing: 0 },
  input: {
    height: 52, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.md,
    ...Typography.bodyMd, color: Colors.onSurface,
  },
  inputRow: {
    height: 52, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  inputInner: { flex: 1, ...Typography.bodyMd, color: Colors.onSurface },
  inputFocused: { borderColor: Colors.primary },
  eyeBtn: { padding: 4 },
  eyeIcon: { fontSize: 16 },
  ctaButton: { height: 56, borderRadius: Radius.lg, marginTop: Spacing.sm },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.outlineVariant },
  dividerText: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  terms: { ...Typography.bodySm, color: Colors.onSurfaceVariant, textAlign: 'center', marginTop: Spacing.xxl, lineHeight: 20 },
  termsLink: { color: Colors.primary, fontFamily: 'WorkSans_500Medium' },
});
