import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';

const OTP_LENGTH = 6;

export function OTPVerificationScreen({ navigation, route }: OnboardingScreenProps<'OTPVerification'>) {
  const { email } = route.params;
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      const next = [...otp];
      next[index - 1] = '';
      setOtp(next);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const isComplete = otp.every(d => d !== '');
  const maskedEmail = email ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + b.replace(/./g, '•') + c) : '';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <Text style={styles.iconText}>✉️</Text>
          </View>
          <Text style={styles.headline}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.emailAccent}>{maskedEmail || 'your email'}</Text>
          </Text>
        </View>

        <View style={styles.otpRow}>
          {Array.from({ length: OTP_LENGTH }).map((_, i) => (
            <TextInput
              key={i}
              ref={r => { inputRefs.current[i] = r; }}
              style={[styles.otpBox, otp[i] ? styles.otpBoxFilled : null]}
              value={otp[i]}
              onChangeText={v => handleChange(v, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="number-pad"
              maxLength={1}
              autoFocus={i === 0}
              selectTextOnFocus
              caretHidden
            />
          ))}
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            label="Verify"
            onPress={() => navigation.replace('NameEntry')}
            disabled={!isComplete}
          />
          <TouchableOpacity style={styles.resendBtn} onPress={() => setOtp(Array(OTP_LENGTH).fill(''))}>
            <Text style={styles.resendText}>
              Didn't receive it? <Text style={styles.resendLink}>Resend code</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  inner: { flex: 1, paddingHorizontal: Spacing.containerMargin, paddingTop: 80, paddingBottom: 40, justifyContent: 'space-between' },
  header: { alignItems: 'center', gap: Spacing.md },
  iconBadge: {
    width: 72, height: 72, borderRadius: Radius.xl,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 32 },
  headline: { ...Typography.headlineMd, color: Colors.onSurface, textAlign: 'center' },
  subtitle: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 24 },
  emailAccent: { color: Colors.primary, fontFamily: 'WorkSans_700Bold' },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  otpBox: {
    width: 48, height: 60, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
    textAlign: 'center', fontSize: 24, fontFamily: 'Manrope_700Bold',
    color: Colors.onSurface,
  },
  otpBoxFilled: {
    borderColor: Colors.primary, backgroundColor: `${Colors.primary}10`,
  },
  footer: { gap: Spacing.md },
  resendBtn: { alignItems: 'center', paddingVertical: 8 },
  resendText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
  resendLink: { color: Colors.primary, fontFamily: 'WorkSans_500Medium' },
});
