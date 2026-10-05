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
  startVoice?: boolean;
};

export type VoiceErrorCode =
  | 'NO_PERMISSION'
  | 'OFFLINE_PACK_MISSING'
  | 'NO_MATCH'
  | 'CANCELLED'
  | 'BUSY'
  | 'UNSUPPORTED'
  | 'ERROR';
