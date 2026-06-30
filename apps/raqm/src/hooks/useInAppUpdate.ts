import { useEffect } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { checkForUpdate, UpdateFlow } from 'react-native-in-app-updates';

export function useInAppUpdate() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const check = async () => {
      try {
        await checkForUpdate(UpdateFlow.FLEXIBLE, __DEV__);
      } catch {
        // silently ignore — update check is best-effort
      }
    };

    check();

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') check();
    });

    return () => subscription.remove();
  }, []);
}
