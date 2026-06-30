import { useEffect } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import InAppUpdates, { IAUUpdateKind } from 'react-native-in-app-updates';

const updates = new InAppUpdates(__DEV__);

export function useInAppUpdate() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const checkForUpdate = async () => {
      try {
        const { isAvailable } = await updates.checkNeedsUpdate();
        if (isAvailable) {
          updates.startUpdate({ updateType: IAUUpdateKind.FLEXIBLE });
        }
      } catch {
        // silently ignore — update check is best-effort
      }
    };

    checkForUpdate();

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') checkForUpdate();
    });

    return () => subscription.remove();
  }, []);
}
