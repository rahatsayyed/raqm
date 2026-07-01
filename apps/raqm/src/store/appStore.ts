import { create } from 'zustand';

interface AppStore {
  isOnboardingComplete: boolean;
  userName: string;
  setOnboardingComplete: (name: string) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  isOnboardingComplete: false,
  userName: '',
  setOnboardingComplete: (userName) => set({ isOnboardingComplete: true, userName }),
}));
