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
  Analytics: undefined;
  Split: undefined;
  Chat: undefined;
};

// Push screens that sit on top of the tab navigator
export type MainStackParamList = {
  Tabs: NavigatorScreenParams<MainTabParamList> | undefined;
  // initialQuery/focusSearch: set by "View Merchant" (TransactionDetail) and the
  // TopHeader search icon respectively, to pre-filter/open the ledger search.
  // TransactionsScreen consumes them once then clears via setParams.
  Transactions: { initialQuery?: string; focusSearch?: boolean } | undefined;
  More: undefined;
  TransactionDetail: { transactionId: number };
  AddTransaction: { pickedCategoryId?: number; pickedSubcategoryId?: number } | undefined;
  // Reached only from the launcher shortcut, the Quick Settings tile, and the
  // home-screen widgets (see src/navigation/deepLinks.ts). Params are always
  // undefined on entry; the category round-trip re-enters it via popTo(..., merge).
  QuickAddCash: { pickedCategoryId?: number; pickedSubcategoryId?: number } | undefined;
  EditTransaction: {
    transactionId: number;
    pickedCategoryId?: number;
    pickedSubcategoryId?: number;
  };
  CategoryPicker: { returnTo: 'AddTransaction' | 'EditTransaction' | 'QuickAddCash'; transactionId?: number; direction?: 'expense' | 'income' };
  AccountDetail: { bankName: string; last4?: string };
  GroceryListDetail: { listId: number; listName: string };
  Budgets: undefined;
  NotificationSettings: undefined;
  NotificationApps: undefined;
  HideBalances: undefined;
  CategoryDetail: { categoryId: number; categoryName: string; period?: string };
  DeletedTransactions: undefined;
  Import: undefined;
  AxioImport: undefined;
  Grocery: undefined;
  DuesReminders: undefined;
  SplitCircles: undefined;
  SplitCreate: { sourceTxId?: number; prefillTitle?: string; prefillAmount?: number } | undefined;
  SplitReview: {
    title: string;
    totalAmount: number;
    sourceTxId: number | null;
    description: string | null;
    participants: { name: string; phoneNumber: string | null; shareAmount: number; isSelf: boolean }[];
  };
  SplitDetail: { splitId: number };
  Rules: { section?: 'category' | 'merchant' | 'amount' } | undefined;
  ManageAccounts: undefined;
  SmsInbox: undefined;
  SmsThread: { key: string };
  CategoryOverview: undefined;
  SpendDetail:
    | { filterType: 'category'; categoryId: number; categoryName: string }
    | { filterType: 'account'; bankName: string; last4?: string }
    | { filterType: 'merchant'; merchant: string };
};

export type OnboardingScreenProps<T extends keyof OnboardingStackParamList> =
  NativeStackScreenProps<OnboardingStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>;

export type MainStackScreenProps<T extends keyof MainStackParamList> =
  NativeStackScreenProps<MainStackParamList, T>;
