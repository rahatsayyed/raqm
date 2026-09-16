import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { Icon } from '../../components/Icon';
import { Colors, Spacing } from '../../theme';
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
    <KeyboardAwareScrollView
      enableOnAndroid
      extraScrollHeight={Spacing.lg}
      keyboardShouldPersistTaps="handled"
      className="flex-1 bg-bg-base px-container-margin pt-20 pb-10"
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-1 justify-between">
        <View className="items-center gap-md">
          <View className="w-[72px] h-[72px] rounded-xl bg-accent-primary items-center justify-center">
            <Icon name="email-outline" size={32} color={Colors.bgBase} />
          </View>
          <Text className="font-inter-semibold text-headline-md text-ink-headline text-center">Check your email</Text>
          <Text className="font-inter text-body-md text-ink-body text-center leading-6">
            We sent a 6-digit code to{'\n'}
            <Text className="text-accent-primary font-inter-bold">{maskedEmail || 'your email'}</Text>
          </Text>
        </View>

        <View className="flex-row justify-center gap-sm">
          {Array.from({ length: OTP_LENGTH }).map((_, i) => (
            <TextInput
              key={i}
              ref={r => { inputRefs.current[i] = r; }}
              className={`w-12 h-[60px] rounded-lg border-[1.5px] bg-bg-surface text-center font-mono-medium text-numeric-lg text-ink-headline ${
                otp[i] ? 'border-accent-primary bg-accent-primary/10' : 'border-border-subtle'
              }`}
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

        <View className="gap-md">
          <PrimaryButton
            label="Verify"
            onPress={() => navigation.replace('NameEntry')}
            disabled={!isComplete}
          />
          <TouchableOpacity className="items-center py-2" onPress={() => setOtp(Array(OTP_LENGTH).fill(''))}>
            <Text className="font-inter text-body-md text-ink-body">
              Didn't receive it? <Text className="text-accent-primary font-inter-medium">Resend code</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
}
