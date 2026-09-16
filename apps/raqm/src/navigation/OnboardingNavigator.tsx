import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { PermissionsScreen } from '../screens/onboarding/PermissionsScreen';
import { DateRangeScreen } from '../screens/onboarding/DateRangeScreen';
import { ScanningProgressScreen } from '../screens/onboarding/ScanningProgressScreen';
import { AccountSelectionScreen } from '../screens/onboarding/AccountSelectionScreen';
import { ScanCompleteScreen } from '../screens/onboarding/ScanCompleteScreen';
import { ManualAccountSetupScreen } from '../screens/onboarding/ManualAccountSetupScreen';
import { SetupCompleteScreen } from '../screens/onboarding/SetupCompleteScreen';
import { BudgetSetupScreen } from '../screens/onboarding/BudgetSetupScreen';
import { SignUpScreen } from '../screens/onboarding/SignUpScreen';
import { NameEntryScreen } from '../screens/onboarding/NameEntryScreen';
import { OTPVerificationScreen } from '../screens/onboarding/OTPVerificationScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Permissions" component={PermissionsScreen} />
      <Stack.Screen name="DateRange" component={DateRangeScreen} />
      <Stack.Screen name="ScanningProgress" component={ScanningProgressScreen} />
      <Stack.Screen name="AccountSelection" component={AccountSelectionScreen} />
      <Stack.Screen name="ScanComplete" component={ScanCompleteScreen} />
      <Stack.Screen name="ManualAccountSetup" component={ManualAccountSetupScreen} />
      <Stack.Screen name="SetupComplete" component={SetupCompleteScreen} />
      <Stack.Screen name="BudgetSetup" component={BudgetSetupScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="NameEntry" component={NameEntryScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
    </Stack.Navigator>
  );
}
