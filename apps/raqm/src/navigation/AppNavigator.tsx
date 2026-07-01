import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainNavigator } from './MainNavigator';
import { useAppStore } from '../store/appStore';

export function AppNavigator() {
  const isOnboardingComplete = useAppStore(s => s.isOnboardingComplete);

  return (
    <NavigationContainer>
      {isOnboardingComplete ? <MainNavigator /> : <OnboardingNavigator />}
    </NavigationContainer>
  );
}
