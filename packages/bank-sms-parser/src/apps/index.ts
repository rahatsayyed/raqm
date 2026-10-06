import { TransactionType } from '../core/types';
import { AMOUNT, UpiAppNotificationParser, UpiAppConfig } from './UpiAppNotificationParser';

const SLICE_DEBIT = new RegExp(
  `^sent\\s+${AMOUNT}\\s+to\\s+(?<merchant>.+?)\\s*\\((?:UPI\\s+)?transaction\\s+success(?:ful)?\\)`,
  'i',
);

const CRED_PAYMENT = new RegExp(
  `^(?:your\\s+)?(?:cred\\s+)?(?:bill\\s+)?payment\\s+of\\s+${AMOUNT}\\s+(?:for|towards)\\s+(?<merchant>.+?)\\s+(?:is\\s+|was\\s+|has\\s+been\\s+)?(?:success(?:ful(?:ly)?)?|completed)\\s*[.!]?\\s*$`,
  'i',
);

const CRED_PAID_FOR = new RegExp(
  `^you\\s+paid\\s+${AMOUNT}\\s+for\\s+(?<merchant>.+?)\\s*$`,
  'i',
);

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
  {
    packageName: 'indwin.c3.shareapp',
    appName: 'Slice App',
    extraDebitPatterns: [SLICE_DEBIT],
  },
  {
    packageName: 'com.dreamplug.androidapp',
    appName: 'CRED App',
    extraDebitPatterns: [CRED_PAYMENT, CRED_PAID_FOR],
    debitType: TransactionType.TRANSFER,
  },
];

export const UPI_APP_PARSERS: UpiAppNotificationParser[] = BUILT_IN_CONFIGS.map(
  (config) => new UpiAppNotificationParser(config),
);

export const BUILT_IN_NOTIFICATION_APPS: ReadonlyArray<UpiAppConfig> = BUILT_IN_CONFIGS;

export { UpiAppNotificationParser };
export type { UpiAppConfig };
