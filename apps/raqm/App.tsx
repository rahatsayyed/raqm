import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useInAppUpdate } from './src/hooks/useInAppUpdate';
import { useFonts } from 'expo-font';
import { Fraunces_500Medium } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { Colors } from './src/theme';

SplashScreen.preventAutoHideAsync();

function AppContent({ onLayout }: { onLayout: () => void }) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    NavigationBar.setStyle('dark');
  }, []);

  return (
    // Top inset only: the bottom tab bar applies the bottom inset itself —
    // padding here too doubled the gap above the system nav bar.
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: Colors.surface }} onLayout={onLayout}>
      <StatusBar style="light" />
      <AppNavigator />
    </View>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_500Medium,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
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
