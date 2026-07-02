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
import { HomeIcon, TransactionsIcon, AnalyticsIcon, MoreIcon, GroceryIcon } from '../components/TabIcon';
import { Colors } from '../theme';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.outline,
        tabBarStyle: {
          backgroundColor: Colors.surfaceContainerLowest,
          borderTopColor: Colors.outlineVariant,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontFamily: 'WorkSans_500Medium',
          fontSize: 11,
          marginBottom: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home', tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ tabBarLabel: 'Transactions', tabBarIcon: ({ color, size }) => <TransactionsIcon color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ tabBarLabel: 'Analytics', tabBarIcon: ({ color, size }) => <AnalyticsIcon color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Grocery"
        component={GroceryScreen}
        options={{ tabBarLabel: 'Grocery', tabBarIcon: ({ color, size }) => <GroceryIcon color={color} size={size} /> }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{ tabBarLabel: 'More', tabBarIcon: ({ color, size }) => <MoreIcon color={color} size={size} /> }}
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
      <Stack.Screen name="GroceryListDetail" component={GroceryListDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}
