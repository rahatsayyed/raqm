import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabParamList, MainStackParamList } from './types';
import { DashboardScreen } from '../screens/main/DashboardScreen';
import { TransactionsScreen } from '../screens/main/TransactionsScreen';
import { AnalyticsScreen } from '../screens/main/AnalyticsScreen';
import { SplitScreen } from '../screens/main/SplitScreen';
import { ChatScreen } from '../screens/main/ChatScreen';
import { GroceryScreen } from '../screens/main/GroceryScreen';
import { MoreScreen } from '../screens/main/MoreScreen';
import { TransactionDetailScreen } from '../screens/main/TransactionDetailScreen';
import { AddTransactionScreen } from '../screens/main/AddTransactionScreen';
import { QuickAddCashScreen } from '../screens/main/QuickAddCashScreen';
import { EditTransactionScreen } from '../screens/main/EditTransactionScreen';
import { CategoryPickerScreen } from '../screens/main/CategoryPickerScreen';
import { AccountDetailScreen } from '../screens/main/AccountDetailScreen';
import { GroceryListDetailScreen } from '../screens/main/GroceryListDetailScreen';
import { BudgetsScreen } from '../screens/main/BudgetsScreen';
import { NotificationSettingsScreen } from '../screens/main/NotificationSettingsScreen';
import { NotificationAppsScreen } from '../screens/main/NotificationAppsScreen';
import { HideBalancesScreen } from '../screens/main/HideBalancesScreen';
import { CategoryDetailScreen } from '../screens/main/CategoryDetailScreen';
import { DeletedTransactionsScreen } from '../screens/main/DeletedTransactionsScreen';
import { ImportScreen } from '../screens/main/ImportScreen';
import { AxioImportScreen } from '../screens/main/AxioImportScreen';
import { DuesRemindersScreen } from '../screens/main/DuesRemindersScreen';
import { RulesScreen } from '../screens/main/RulesScreen';
import { ManageAccountsScreen } from '../screens/main/ManageAccountsScreen';
import { SmsInboxScreen } from '../screens/main/SmsInboxScreen';
import { SmsThreadScreen } from '../screens/main/SmsThreadScreen';
import { CategoryOverviewScreen } from '../screens/main/CategoryOverviewScreen';
import { SpendDetailScreen } from '../screens/main/SpendDetailScreen';
import { SplitCirclesScreen } from '../screens/main/SplitCirclesScreen';
import { SplitCreateScreen } from '../screens/main/SplitCreateScreen';
import { SplitDetailScreen } from '../screens/main/SplitDetailScreen';
import { HomeIcon, AnalyticsIcon, SplitIcon, ChatIcon } from '../components/TabIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();

// 4-item nav — Home / Analytics / Split / Chat. Timeline (Transactions) and More
// are reached as push screens (via "View all" and the TopHeader avatar), not tabs.
function TabNavigator() {
  // A fixed tab-bar height overrides react-navigation's inset-aware sizing and
  // pushes the bar behind the system nav — add the bottom inset back explicitly.
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.borderSubtle,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_600SemiBold',
          fontSize: 9,
          letterSpacing: 1.1,
          textTransform: 'uppercase',
          marginBottom: 6,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{ tabBarLabel: 'HOME', tabBarIcon: ({ color }) => <HomeIcon color={color} size={22} /> }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ tabBarLabel: 'ANALYTICS', tabBarIcon: ({ color }) => <AnalyticsIcon color={color} size={22} /> }}
      />
      <Tab.Screen
        name="Split"
        component={SplitScreen}
        options={{ tabBarLabel: 'SPLIT', tabBarIcon: ({ color }) => <SplitIcon color={color} size={22} /> }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ tabBarLabel: 'CHAT', tabBarIcon: ({ color }) => <ChatIcon color={color} size={22} /> }}
      />
    </Tab.Navigator>
  );
}

export function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="Transactions" component={TransactionsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="More" component={MoreScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="AddTransaction" component={AddTransactionScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="QuickAddCash" component={QuickAddCashScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="EditTransaction" component={EditTransactionScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CategoryPicker" component={CategoryPickerScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="AccountDetail" component={AccountDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Grocery" component={GroceryScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="SplitCircles" component={SplitCirclesScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="SplitCreate" component={SplitCreateScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="SplitDetail" component={SplitDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="GroceryListDetail" component={GroceryListDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Budgets" component={BudgetsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="NotificationApps" component={NotificationAppsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="HideBalances" component={HideBalancesScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="DeletedTransactions" component={DeletedTransactionsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Import" component={ImportScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="AxioImport" component={AxioImportScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="DuesReminders" component={DuesRemindersScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Rules" component={RulesScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CategoryOverview" component={CategoryOverviewScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="SpendDetail" component={SpendDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ManageAccounts" component={ManageAccountsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="SmsInbox" component={SmsInboxScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="SmsThread" component={SmsThreadScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}
