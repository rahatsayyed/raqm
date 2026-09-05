import { UpiAppNotificationParser, UpiAppConfig } from './UpiAppNotificationParser';

/**
 * Apps Raqm ships notification parsing for. The user can monitor any *other* installed
 * app too — an app with no entry here simply produces no transaction and gets queued for
 * the "report unsupported app" flow instead.
 */
const BUILT_IN_CONFIGS: UpiAppConfig[] = [
  { packageName: 'com.google.android.apps.nbu.paisa.user', appName: 'Google Pay' },
  { packageName: 'com.phonepe.app', appName: 'PhonePe' },
  { packageName: 'net.one97.paytm', appName: 'Paytm' },
  { packageName: 'in.org.npci.upiapp', appName: 'BHIM' },
];

export const UPI_APP_PARSERS: UpiAppNotificationParser[] = BUILT_IN_CONFIGS.map(
  (config) => new UpiAppNotificationParser(config),
);

export const BUILT_IN_NOTIFICATION_APPS: ReadonlyArray<UpiAppConfig> = BUILT_IN_CONFIGS;

export { UpiAppNotificationParser };
export type { UpiAppConfig };
