export interface SmsMessage {
  body: string;
  sender: string;
  timestamp: number;
}

export interface InstalledApp {
  packageName: string;
  appName: string;
}
