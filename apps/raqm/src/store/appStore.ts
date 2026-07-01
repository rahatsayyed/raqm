import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppStore {
  isOnboardingComplete: boolean;
  userName: string;
  setOnboardingComplete: (name: string) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      isOnboardingComplete: false,
      userName: '',
      setOnboardingComplete: (userName) => set({ isOnboardingComplete: true, userName }),
    }),
    {
      name: 'raqm-app',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isOnboardingComplete: state.isOnboardingComplete,
        userName: state.userName,
      }),
    },
  ),
);
