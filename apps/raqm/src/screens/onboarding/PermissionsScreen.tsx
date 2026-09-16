import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Platform, PermissionsAndroid, ScrollView, AppState, Pressable } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { OnboardingScreenProps } from '../../navigation/types';
import { PermissionRow } from '../../components/onboarding/PermissionRow';
import { StepCounter } from '../../components/onboarding/StepCounter';
import { OnboardingButton } from '../../components/onboarding/OnboardingButton';
import { SmsReader } from '../../native/SmsReader';

type RowKey = 'sms' | 'notificationAccess' | 'location' | 'notifications';

// Android permission constants and native calls copied from the deleted
// PermissionSMSReadScreen / PermissionNotificationAccessScreen /
// PermissionLocationScreen — see Task 6 Step 1 for the exact source lines
// this was carried over from.
async function requestAndroidRow(key: RowKey): Promise<boolean> {
  if (key === 'sms') {
    // PermissionSMSReadScreen requested READ_SMS + RECEIVE_SMS together
    // (RECEIVE_SMS isn't reliably auto-granted alongside READ_SMS across
    // OEMs, and the live-SMS BroadcastReceiver needs it explicitly).
    const results = await PermissionsAndroid.requestMultiple([
      'android.permission.READ_SMS' as any,
      'android.permission.RECEIVE_SMS' as any,
    ]);
    return results['android.permission.READ_SMS'] === PermissionsAndroid.RESULTS.GRANTED;
  }
  if (key === 'location') {
    // Background location is required, not just foreground: bank SMS can
    // arrive (and the location tag gets captured) while the app is not in
    // the foreground, since SMS reading happens via a background
    // BroadcastReceiver. Android 10+ requires foreground to be granted
    // first before background can be requested at all.
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== Location.PermissionStatus.GRANTED) {
      return false;
    }
    const background = await Location.requestBackgroundPermissionsAsync();
    return background.status === Location.PermissionStatus.GRANTED;
  }
  // notificationAccess (NotificationListenerService) is not a runtime
  // permission — PermissionNotificationAccessScreen just called
  // SmsReader.openNotificationListenerSettings() and moved on, since the
  // native call doesn't resolve with a granted/denied result. We open the
  // same settings screen; the actual granted state is re-checked via
  // SmsReader.isNotificationListenerEnabled() when the app regains focus
  // (see the AppState listener below) since the user grants it outside
  // the app.
  SmsReader.openNotificationListenerSettings();
  return SmsReader.isNotificationListenerEnabled();
}

async function requestNotifications(): Promise<boolean> {
  // Bug fix: POST_NOTIFICATIONS doesn't exist as a runtime permission below
  // Android 13 (API 33) — PermissionsAndroid.request for it silently
  // resolves denied/false with no dialog on older Android, permanently
  // blocking this row. expo-notifications' requestPermissionsAsync handles
  // every Android version correctly (no-op/auto-granted pre-33, real system
  // dialog on 33+) and iOS, matching src/notifications/notifications.ts.
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// C2 fix: reads the ACTUAL current OS permission state, not session-local
// grant flags, so a permission granted previously (or outside the app,
// e.g. via device Settings) shows as "Granted" immediately on mount.
async function checkAndroidRow(key: RowKey): Promise<boolean> {
  if (key === 'sms') {
    return PermissionsAndroid.check('android.permission.READ_SMS' as any);
  }
  if (key === 'location') {
    const { status } = await Location.getBackgroundPermissionsAsync();
    return status === Location.PermissionStatus.GRANTED;
  }
  if (key === 'notificationAccess') {
    return SmsReader.isNotificationListenerEnabled();
  }
  // Bug fix: PermissionsAndroid.check(POST_NOTIFICATIONS) is meaningless
  // below Android 13 (the permission doesn't exist there) and always read
  // false. expo-notifications' getPermissionsAsync reads the real OS state
  // on every Android version (and iOS).
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export function PermissionsScreen({ navigation }: OnboardingScreenProps<'Permissions'>) {
  const isAndroid = Platform.OS === 'android';
  const [granted, setGranted] = useState<Record<RowKey, boolean>>({
    sms: false,
    notificationAccess: false,
    location: false,
    notifications: false,
  });

  // C2 fix: seed every row's granted state from the real OS permission
  // state on mount, rather than starting every row "ungranted" even when
  // the user already granted it in a previous session.
  useEffect(() => {
    if (!isAndroid) return;
    let cancelled = false;
    (async () => {
      const [sms, notificationAccess, location, notifications] = await Promise.all([
        checkAndroidRow('sms'),
        checkAndroidRow('notificationAccess'),
        checkAndroidRow('location'),
        checkAndroidRow('notifications'),
      ]);
      if (!cancelled) {
        setGranted({ sms, notificationAccess, location, notifications });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAndroid]);

  // Notification-listener access and location (Android 11+ "Allow all the
  // time") are both potentially granted in system Settings, outside the
  // app, so re-check their state whenever the app regains foreground focus
  // — same pattern CLAUDE.md calls out for settings-dependent screens.
  useEffect(() => {
    if (!isAndroid) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setGranted((prev) => ({ ...prev, notificationAccess: SmsReader.isNotificationListenerEnabled() }));
        checkAndroidRow('location').then((location) => {
          setGranted((prev) => ({ ...prev, location }));
        });
      }
    });
    return () => sub.remove();
  }, [isAndroid]);

  const grant = useCallback(async (key: RowKey) => {
    const ok = key === 'notifications' ? await requestNotifications() : await requestAndroidRow(key);
    setGranted((prev) => ({ ...prev, [key]: ok }));
  }, []);

  const canContinue = isAndroid
    ? granted.sms && granted.notificationAccess && granted.location && granted.notifications
    : granted.notifications;

  const next = useCallback(() => {
    navigation.navigate(isAndroid ? 'DateRange' : 'ManualAccountSetup');
  }, [isAndroid, navigation]);

  return (
    <View className="flex-1 bg-bg-base px-container-margin pt-xxl">
      <StepCounter step={2} totalSteps={isAndroid ? 10 : 8} />
      <Text className="font-inter-semibold text-body-standard text-ink-headline mb-md">
        A couple of permissions
      </Text>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {isAndroid ? (
          <>
            <PermissionRow
              index={0}
              icon="message-text-outline"
              title="Read bank SMS"
              reason="So I can find your transactions automatically"
              granted={granted.sms}
              onGrant={() => grant('sms')}
            />
            <PermissionRow
              index={1}
              icon="bell-outline"
              title="Manage bank notifications"
              reason="So I can hide duplicate bank alerts once I've read them"
              granted={granted.notificationAccess}
              onGrant={() => grant('notificationAccess')}
            />
            <PermissionRow
              index={2}
              icon="map-marker-outline"
              title="Location"
              reason="So I can tag where a transaction happened when the SMS arrives"
              granted={granted.location}
              onGrant={() => grant('location')}
            />
            <PermissionRow
              index={3}
              icon="bell-ring-outline"
              title="Notifications"
              reason="So I can alert you about spending patterns"
              granted={granted.notifications}
              onGrant={() => grant('notifications')}
            />
          </>
        ) : (
          <PermissionRow
            index={0}
            icon="bell-outline"
            title="Notifications"
            reason="So I can alert you about spending patterns"
            granted={granted.notifications}
            onGrant={() => grant('notifications')}
          />
        )}
      </ScrollView>

      <Text className="font-inter text-annotation text-ink-label mt-md mb-lg">
        Everything is processed on your device. Nothing leaves your phone.
      </Text>

      {isAndroid && (
        <Pressable onPress={() => navigation.navigate('GPayPdfImport')}>
          <Text className="font-inter-semibold text-supporting-text text-accent-primary text-center mb-md">
            Or import a PDF statement instead
          </Text>
        </Pressable>
      )}

      <OnboardingButton label="Continue" onPress={next} disabled={!canContinue} />
    </View>
  );
}
