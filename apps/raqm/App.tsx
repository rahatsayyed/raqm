import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { NavigationBar } from 'expo-navigation-bar';
import { useInAppUpdate } from './src/hooks/useInAppUpdate';
import { useFonts } from 'expo-font';
import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { WorkSans_400Regular, WorkSans_500Medium, WorkSans_700Bold } from '@expo-google-fonts/work-sans';
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';

SplashScreen.preventAutoHideAsync();

function AppContent({ onLayout }: { onLayout: () => void }) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    NavigationBar.setStyle('dark');
  }, []);

  return (
    <View style={{ flex: 1, paddingBottom: insets.bottom, backgroundColor: '#f8faf9' }} onLayout={onLayout}>
      <AppNavigator />
    </View>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_700Bold,
    DMMono_400Regular,
    DMMono_500Medium,
  });

  useInAppUpdate();

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppContent onLayout={onLayoutRootView} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
