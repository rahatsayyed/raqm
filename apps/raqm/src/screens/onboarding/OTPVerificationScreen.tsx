import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
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
    <KeyboardAvoidingView className="flex-1 bg-surface" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="flex-1 px-container-margin pt-20 pb-10 justify-between">
        <View className="items-center gap-md">
          <View className="w-[72px] h-[72px] rounded-xl bg-primary-container items-center justify-center">
            <Text className="text-[32px]">✉️</Text>
          </View>
          <Text className="font-inter-semibold text-headline-md text-on-surface text-center">Check your email</Text>
          <Text className="font-inter text-body-md text-on-surface-variant text-center leading-6">
            We sent a 6-digit code to{'\n'}
            <Text className="text-primary font-inter-bold">{maskedEmail || 'your email'}</Text>
          </Text>
        </View>

        <View className="flex-row justify-center gap-sm">
          {Array.from({ length: OTP_LENGTH }).map((_, i) => (
            <TextInput
              key={i}
              ref={r => { inputRefs.current[i] = r; }}
              className={`w-12 h-[60px] rounded-lg border-[1.5px] bg-surface-container-lowest text-center text-2xl font-inter-bold text-on-surface ${
                otp[i] ? 'border-primary bg-[#75daa810]' : 'border-outline-variant'
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
            <Text className="font-inter text-body-md text-on-surface-variant">
              Didn't receive it? <Text className="text-primary font-inter-medium">Resend code</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
