import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
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
  // initialQuery: set by "View Merchant" (TransactionDetail) to pre-filter the
  // ledger search; TransactionsScreen consumes it once then clears it via setParams.
  Transactions: { initialQuery?: string } | undefined;
  Analytics: undefined;
  More: undefined;
};

// Push screens that sit on top of the tab navigator
export type MainStackParamList = {
  Tabs: NavigatorScreenParams<MainTabParamList> | undefined;
  TransactionDetail: { transactionId: number };
  AddTransaction: { pickedCategoryId?: number; pickedSubcategoryId?: number } | undefined;
  EditTransaction: { transactionId: number; pickedCategoryId?: number; pickedSubcategoryId?: number };
  CategoryPicker: { returnTo: 'AddTransaction' | 'EditTransaction'; transactionId?: number };
  AccountDetail: { bankName: string; last4?: string };
  GroceryListDetail: { listId: number; listName: string };
  Settings: undefined;
  CategoryDetail: { categoryId: number; categoryName: string; period?: string };
  DeletedTransactions: undefined;
  Grocery: undefined;
  DuesReminders: undefined;
  CategoryRules: undefined;
  MerchantRules: undefined;
  ManageAccounts: undefined;
  SmsInbox: undefined;
  SmsThread: { key: string };
};

export type OnboardingScreenProps<T extends keyof OnboardingStackParamList> =
  NativeStackScreenProps<OnboardingStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>;

export type MainStackScreenProps<T extends keyof MainStackParamList> =
  NativeStackScreenProps<MainStackParamList, T>;
