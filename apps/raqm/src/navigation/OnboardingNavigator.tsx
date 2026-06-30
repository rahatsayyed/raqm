import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { PermissionSMSReadScreen } from '../screens/onboarding/PermissionSMSReadScreen';
import { PermissionNotificationsScreen } from '../screens/onboarding/PermissionNotificationsScreen';
import { PermissionNotificationAccessScreen } from '../screens/onboarding/PermissionNotificationAccessScreen';
import { PermissionLocationScreen } from '../screens/onboarding/PermissionLocationScreen';
import { DateRangeScreen } from '../screens/onboarding/DateRangeScreen';
import { ScanningProgressScreen } from '../screens/onboarding/ScanningProgressScreen';
import { AccountSelectionScreen } from '../screens/onboarding/AccountSelectionScreen';
import { ScanCompleteScreen } from '../screens/onboarding/ScanCompleteScreen';
import { SignUpScreen } from '../screens/onboarding/SignUpScreen';
import { NameEntryScreen } from '../screens/onboarding/NameEntryScreen';
import { OTPVerificationScreen } from '../screens/onboarding/OTPVerificationScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="PermissionSMSRead" component={PermissionSMSReadScreen} />
      <Stack.Screen name="PermissionNotifications" component={PermissionNotificationsScreen} />
      <Stack.Screen name="PermissionNotificationAccess" component={PermissionNotificationAccessScreen} />
      <Stack.Screen name="PermissionLocation" component={PermissionLocationScreen} />
      <Stack.Screen name="DateRange" component={DateRangeScreen} />
      <Stack.Screen name="ScanningProgress" component={ScanningProgressScreen} />
      <Stack.Screen name="AccountSelection" component={AccountSelectionScreen} />
      <Stack.Screen name="ScanComplete" component={ScanCompleteScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="NameEntry" component={NameEntryScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
    </Stack.Navigator>
  );
}
