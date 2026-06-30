import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type OnboardingStackParamList = {
  Welcome: undefined;
  PermissionSMSRead: undefined;
  PermissionSMSReceive: undefined;
  PermissionNotifications: undefined;
  PermissionNotificationAccess: undefined;
  PermissionLocation: undefined;
  DateRange: undefined;
  ScanningProgress: undefined;
  AccountSelection: undefined;
  ScanComplete: undefined;
  SignUp: undefined;
  NameEntry: undefined;
  OTPVerification: { email: string };
};

export type MainTabParamList = {
  Home: undefined;
  Transactions: undefined;
  Analytics: undefined;
  More: undefined;
};

export type OnboardingScreenProps<T extends keyof OnboardingStackParamList> =
  NativeStackScreenProps<OnboardingStackParamList, T>;
