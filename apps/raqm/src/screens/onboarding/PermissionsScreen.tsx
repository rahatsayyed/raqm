import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Platform, PermissionsAndroid, ScrollView, AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { OnboardingScreenProps } from '../../navigation/types';
import { PermissionRow } from '../../components/onboarding/PermissionRow';
import { StepDots } from '../../components/onboarding/StepDots';
import { RqButton } from '../../components/onboarding/RqButton';
import { GlassCard } from '../../components/onboarding/GlassCard';
import { useOnbColors } from '../../theme/onboardingColors';
import { SmsReader } from '../../native/SmsReader';

type RowKey = 'sms' | 'notificationAccess' | 'location' | 'notifications';

// TODO(product-signoff): the claude-design mockup makes Location and
// "Manage bank notifications" optional (only "Read bank SMS" and
// "Notifications" stay required) — see
// docs/superpowers/specs/2026-09-20-onboarding-v3-implementation-notes.md §2.
// NOT enabled here: flipping this changes what the rest of the app can
// assume it has (background-location tagging on every SMS-triggered
// transaction; duplicate bank-notification suppression), and needs
// explicit product sign-off first. Flip this to `true` only once that
// sign-off happens — canContinue and the "· Optional" badges below both
// key off it, so nothing else needs to change.
const LOCATION_AND_NOTIFICATION_ACCESS_OPTIONAL = false;

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
    // first before background can be requested at all. This is ONE
    // combined request, not two separate cards — the UI below reflects
    // that with a single "Location" card.
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
    // Location shows granted only once BOTH foreground and background are
    // actually granted, never on foreground-only.
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
  const insets = useSafeAreaInsets();
  const { scheme } = useOnbColors();
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
    ? granted.sms &&
      granted.notifications &&
      (LOCATION_AND_NOTIFICATION_ACCESS_OPTIONAL || (granted.notificationAccess && granted.location))
    : granted.notifications;

  const next = useCallback(() => {
    navigation.navigate(isAndroid ? 'DateRange' : 'ManualAccountSetup');
  }, [isAndroid, navigation]);

  return (
    <View
      className="flex-1 bg-onb-bg-base px-[20px] dark:bg-onb-bg-base-dark"
      style={{
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 20,
        // Literal artifact padding is "56px 20px 40px" — 20px has no exact
        // Spacing token (sm=8, md=16, lg=24), applied as px-[20px] in className.
      }}
    >
      {/* Literal artifact margin-bottom below the dots is 28px — no exact
          Spacing token (lg=24, xl=32); applied literally instead of mb-lg (24). */}
      <View className="mb-[28px]">
        <StepDots total={8} filled={2} scheme={scheme} />
      </View>

      {/* Literal artifact h1 margin-bottom is 8px — was mb-xs (Spacing.xs = 4). */}
      <Text className="mb-[8px] font-newsreader-italic text-[30px] text-onb-ink-headline dark:text-onb-ink-headline-dark">
        A couple of permissions
      </Text>
      {/* Literal artifact subtitle margin-bottom is 18px — no exact Spacing
          token (md=16, lg=24); applied literally instead of mb-lg (24). */}
      <Text className="mb-[18px] font-instrument text-[15px] leading-[22px] text-onb-ink-body dark:text-onb-ink-body-dark">
        Each one only reads what it needs, on this device.
      </Text>

      <GlassCard scheme={scheme}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {isAndroid ? (
            <View className="gap-[10px]">
              <View className="flex-row gap-[10px]">
                <PermissionRow
                  index={0}
                  icon="message-outline"
                  title="Read bank SMS"
                  reason="Finds transactions automatically. Never leaves your phone."
                  granted={granted.sms}
                  onGrant={() => grant('sms')}
                  scheme={scheme}
                />
                <PermissionRow
                  index={1}
                  icon="bell-outline"
                  title="Notifications"
                  reason="Quiet spend nudges, on your terms."
                  granted={granted.notifications}
                  onGrant={() => grant('notifications')}
                  scheme={scheme}
                />
              </View>
              <View className="flex-row gap-[10px]">
                <PermissionRow
                  index={2}
                  icon="map-marker-outline"
                  iconColor="notice"
                  title="Location"
                  reason="Tags where a spend happened."
                  optional={LOCATION_AND_NOTIFICATION_ACCESS_OPTIONAL}
                  granted={granted.location}
                  onGrant={() => grant('location')}
                  scheme={scheme}
                />
                <PermissionRow
                  index={3}
                  icon="bell-off-outline"
                  title="Manage notifications"
                  reason="Hides duplicate bank alerts once read."
                  optional={LOCATION_AND_NOTIFICATION_ACCESS_OPTIONAL}
                  granted={granted.notificationAccess}
                  onGrant={() => grant('notificationAccess')}
                  scheme={scheme}
                />
              </View>
            </View>
          ) : (
            <PermissionRow
              index={0}
              icon="bell-outline"
              title="Notifications"
              reason="So I can alert you about spending patterns"
              granted={granted.notifications}
              onGrant={() => grant('notifications')}
              scheme={scheme}
            />
          )}
        </ScrollView>
      </GlassCard>

      {/* Fills the gap between the card (which now hugs its content) and the
          footer note below, matching the artifact's `margin: auto 0 0` on
          that note — the note sits just above Continue, not the card
          stretching to the screen's full height. */}
      <View className="flex-1" />

      <Text className="mb-sm text-center font-instrument text-[11px] text-onb-ink-body dark:text-onb-ink-body-dark">
        Location and notification management are optional.
      </Text>

      {/* Bug #4 fix: PDF-import belongs on ScanComplete per the artifact, not here —
          removed the duplicate link that used to live on this screen. */}

      <RqButton label="Continue" scheme={scheme} onPress={next} disabled={!canContinue} />
    </View>
  );
}
