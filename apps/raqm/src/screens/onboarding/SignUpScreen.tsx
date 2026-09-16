import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { Icon } from '../../components/Icon';
import { Colors, Radius, Spacing } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { GhostButton } from '../../components/GhostButton';

// PrimaryButton only accepts a `style` (ViewStyle) prop, not `className`.
const ctaButtonStyle = { height: 56, borderRadius: Radius.lg, marginTop: Spacing.sm };

export function SignUpScreen({ navigation }: OnboardingScreenProps<'SignUp'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  const isValid = email.includes('@') && password.length >= 8;

  const handleContinue = () => {
    navigation.replace('OTPVerification', { email });
  };

  return (
    <KeyboardAwareScrollView
      enableOnAndroid
      extraScrollHeight={Spacing.lg}
      keyboardShouldPersistTaps="handled"
      className="flex-1 bg-bg-base px-container-margin pt-14 pb-10"
      showsVerticalScrollIndicator={false}
    >
        <View className="items-center mb-xxl gap-md">
          <View className="w-16 h-16 rounded-xl bg-accent-primary items-center justify-center" style={logoShadow}>
            <Text className="text-2xl text-bg-base font-inter-bold">رقم</Text>
          </View>
          <Text className="font-inter-semibold text-headline-md text-ink-headline text-center">Create your account</Text>
          <Text className="font-inter text-body-md text-ink-body text-center max-w-[280px] leading-[22px]">
            Sync your data across devices and never lose your history.
          </Text>
        </View>

        <View className="gap-md">
          <View className="gap-2">
            <Text className="font-mono-medium text-[13px] leading-5 text-ink-label">Email</Text>
            <TextInput
              className={`h-[52px] rounded-lg border-[1.5px] bg-bg-surface px-md font-inter text-body-md text-ink-headline ${
                focusedField === 'email' ? 'border-accent-primary' : 'border-border-subtle'
              }`}
              placeholder="you@example.com"
              placeholderTextColor={Colors.inkLabel}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <View className="gap-2">
            <Text className="font-mono-medium text-[13px] leading-5 text-ink-label">Password</Text>
            <View
              className={`h-[52px] rounded-lg border-[1.5px] bg-bg-surface flex-row items-center px-md ${
                focusedField === 'password' ? 'border-accent-primary' : 'border-border-subtle'
              }`}
            >
              <TextInput
                className="flex-1 font-inter text-body-md text-ink-headline"
                placeholder="Min. 8 characters"
                placeholderTextColor={Colors.inkLabel}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <Pressable onPress={() => setShowPassword(p => !p)} className="p-1">
                <Icon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.inkBody} />
              </Pressable>
            </View>
          </View>

          <PrimaryButton
            label="Continue"
            onPress={handleContinue}
            disabled={!isValid}
            style={ctaButtonStyle}
          />

          <View className="flex-row items-center gap-md">
            <View className="flex-1 h-px bg-border-subtle" />
            <Text className="font-inter text-body-sm text-ink-body">or</Text>
            <View className="flex-1 h-px bg-border-subtle" />
          </View>

          <GhostButton label="Skip — keep data local only" onPress={() => navigation.replace('NameEntry')} />
        </View>

        <Text className="font-inter text-body-sm text-ink-body text-center mt-xxl leading-5">
          By continuing you agree to our{' '}
          <Text className="text-accent-primary font-inter-medium">Terms of Service</Text> and{' '}
          <Text className="text-accent-primary font-inter-medium">Privacy Policy</Text>.
        </Text>
      </KeyboardAwareScrollView>
  );
}

// Colored shadow isn't expressible as a NativeWind class.
const logoShadow = {
  shadowColor: Colors.accentPrimary,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 12,
  elevation: 6,
};
