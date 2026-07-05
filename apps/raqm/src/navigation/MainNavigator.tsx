import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabParamList, MainStackParamList } from './types';
import { DashboardScreen } from '../screens/main/DashboardScreen';
import { TransactionsScreen } from '../screens/main/TransactionsScreen';
import { AnalyticsScreen } from '../screens/main/AnalyticsScreen';
import { GroceryScreen } from '../screens/main/GroceryScreen';
import { MoreScreen } from '../screens/main/MoreScreen';
import { TransactionDetailScreen } from '../screens/main/TransactionDetailScreen';
import { AddTransactionScreen } from '../screens/main/AddTransactionScreen';
import { EditTransactionScreen } from '../screens/main/EditTransactionScreen';
import { CategoryPickerScreen } from '../screens/main/CategoryPickerScreen';
import { AccountDetailScreen } from '../screens/main/AccountDetailScreen';
import { GroceryListDetailScreen } from '../screens/main/GroceryListDetailScreen';
import { SettingsScreen } from '../screens/main/SettingsScreen';
import { CategoryDetailScreen } from '../screens/main/CategoryDetailScreen';
import { DeletedTransactionsScreen } from '../screens/main/DeletedTransactionsScreen';
import { HomeIcon, WalletIcon, LightbulbIcon, MoreIcon } from '../components/TabIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();

// Spring Green Design System: 4-item nav — Home / Timeline / Briefing / More.
// Grocery lives under More as a push screen.
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
        name="Transactions"
        component={TransactionsScreen}
        options={{ tabBarLabel: 'TIMELINE', tabBarIcon: ({ color }) => <WalletIcon color={color} size={22} /> }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ tabBarLabel: 'BRIEFING', tabBarIcon: ({ color }) => <LightbulbIcon color={color} size={22} /> }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{ tabBarLabel: 'MORE', tabBarIcon: ({ color }) => <MoreIcon color={color} size={22} /> }}
      />
    </Tab.Navigator>
  );
}

export function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="AddTransaction" component={AddTransactionScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="EditTransaction" component={EditTransactionScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CategoryPicker" component={CategoryPickerScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="AccountDetail" component={AccountDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Grocery" component={GroceryScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="GroceryListDetail" component={GroceryListDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="DeletedTransactions" component={DeletedTransactionsScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}
