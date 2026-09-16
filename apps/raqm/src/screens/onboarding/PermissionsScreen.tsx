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
    // PermissionLocationScreen: foreground request must succeed first, then
    // requestBackgroundPermissionsAsync() opens system Settings itself for
    // "Allow all the time" (Android 11+ removed the runtime dialog option).
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus === Location.PermissionStatus.GRANTED) {
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      return backgroundStatus === Location.PermissionStatus.GRANTED;
    }
    return false;
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
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  // iOS: the deleted PermissionNotificationsScreen.tsx was Android-only
  // (raw PermissionsAndroid POST_NOTIFICATIONS request, no iOS branch
  // existed to port — Raqm is an Android-only app per CLAUDE.md, this path
  // is dead in practice). Use expo-notifications' standard permission
  // request, matching how expo-notifications is already used elsewhere in
  // this codebase (src/notifications/notifications.ts).
  const { status } = await Notifications.requestPermissionsAsync();
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

  // Notification-listener access is granted in system Settings, outside the
  // app, so re-check its state whenever the app regains foreground focus —
  // same pattern CLAUDE.md calls out for settings-dependent screens.
  useEffect(() => {
    if (!isAndroid) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setGranted((prev) => ({ ...prev, notificationAccess: SmsReader.isNotificationListenerEnabled() }));
      }
    });
    return () => sub.remove();
  }, [isAndroid]);

  const grant = useCallback(async (key: RowKey) => {
    const ok = key === 'notifications' ? await requestNotifications() : await requestAndroidRow(key);
    setGranted((prev) => ({ ...prev, [key]: ok }));
  }, []);

  const canContinue = isAndroid
    ? granted.sms && granted.notificationAccess && granted.location
    : granted.notifications;

  const next = useCallback(() => {
    navigation.navigate(isAndroid ? 'DateRange' : 'ManualAccountSetup');
  }, [isAndroid, navigation]);

  return (
    <View className="flex-1 bg-bg-base px-container-margin pt-xxl">
      <StepCounter step={2} totalSteps={isAndroid ? 9 : 6} />
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
