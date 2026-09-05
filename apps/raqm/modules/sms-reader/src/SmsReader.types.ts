export interface SmsMessage {
  body: string;
  sender: string;
  timestamp: number;
}

export interface InstalledApp {
  packageName: string;
  appName: string;
}

/** Deep-link extras drained off MainActivity's launch intent (shortcut / tile / widget). */
export type LaunchDeepLink = {
  openQuickAdd: boolean;
  openTransaction: number | null;
};
