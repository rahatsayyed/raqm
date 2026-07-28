import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppStore {
  isOnboardingComplete: boolean;
  userName: string;
  userPhone: string;
  userEmail: string;
  setOnboardingComplete: (name: string) => void;
  setUserName: (name: string) => void;
  setUserPhone: (phone: string) => void;
  setUserEmail: (email: string) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      isOnboardingComplete: false,
      userName: '',
      userPhone: '',
      userEmail: '',
      setOnboardingComplete: (userName) => set({ isOnboardingComplete: true, userName }),
      setUserName: (userName) => set({ userName }),
      setUserPhone: (userPhone) => set({ userPhone }),
      setUserEmail: (userEmail) => set({ userEmail }),
    }),
    {
      name: 'raqm-app',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isOnboardingComplete: state.isOnboardingComplete,
        userName: state.userName,
        userPhone: state.userPhone,
        userEmail: state.userEmail,
      }),
    },
  ),
);
