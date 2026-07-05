import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { ParsedTransaction } from '@rahatsayyed/bank-sms-parser';

export type OnboardingStackParamList = {
  Welcome: undefined;
  PermissionSMSRead: undefined;
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
  Grocery: undefined;
  More: undefined;
};

// Push screens that sit on top of the tab navigator
export type MainStackParamList = {
  Tabs: undefined;
  TransactionDetail: { transactionId: number };
  AddTransaction: { pickedCategoryId?: number; pickedSubcategoryId?: number } | undefined;
  EditTransaction: { transactionId: number; pickedCategoryId?: number; pickedSubcategoryId?: number };
  CategoryPicker: { returnTo: 'AddTransaction' | 'EditTransaction'; transactionId?: number };
  AccountDetail: { bankName: string; last4?: string };
  GroceryListDetail: { listId: number; listName: string };
  Settings: undefined;
  CategoryDetail: { categoryId: number; categoryName: string; period?: string };
  DeletedTransactions: undefined;
};

export type OnboardingScreenProps<T extends keyof OnboardingStackParamList> =
  NativeStackScreenProps<OnboardingStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>;

export type MainStackScreenProps<T extends keyof MainStackParamList> =
  NativeStackScreenProps<MainStackParamList, T>;
