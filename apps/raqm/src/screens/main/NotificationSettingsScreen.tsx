import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import { getSetting, setSetting } from '../../db/database';
import { scheduleSummaries } from '../../notifications/notifications';

export function NotificationSettingsScreen({ navigation }: MainStackScreenProps<'NotificationSettings'>) {
  const [notifDaily, setNotifDaily] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(true);
  const [notifMonthly, setNotifMonthly] = useState(true);

  const reload = useCallback(async () => {
    const [daily, weekly, monthly] = await Promise.all([
      getSetting('notif_daily'),
      getSetting('notif_weekly'),
      getSetting('notif_monthly'),
    ]);
    setNotifDaily(daily !== '0');
    setNotifWeekly(weekly !== '0');
    setNotifMonthly(monthly !== '0');
  }, []);

  // This screen stays mounted beneath pushed screens, so re-read on focus rather than mount
  // only — same class of stale-read bug fixed for the old combined SettingsScreen.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  async function onToggleNotif(key: 'notif_daily' | 'notif_weekly' | 'notif_monthly', value: boolean, setter: (v: boolean) => void) {
    setter(value);
    await setSetting(key, value ? '1' : '0');
    await scheduleSummaries();
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="p-container-margin pt-sm pb-[40px]" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-md">
          <Text className="font-inter text-body-md text-primary">← Back</Text>
        </TouchableOpacity>
        <Text className="font-inter-bold text-headline-sm text-on-surface mb-lg">Notifications</Text>

        <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md">
          <View className="flex-row justify-between items-center py-[10px]">
            <Text className="font-inter text-body-standard text-on-surface">Daily summary</Text>
            <Switch
              value={notifDaily}
              onValueChange={(v) => onToggleNotif('notif_daily', v, setNotifDaily)}
              trackColor={{ true: Colors.primary, false: Colors.surfaceVariant }}
            />
          </View>
          <View className="h-[1px] bg-outline-variant" />
          <View className="flex-row justify-between items-center py-[10px]">
            <Text className="font-inter text-body-standard text-on-surface">Weekly summary</Text>
            <Switch
              value={notifWeekly}
              onValueChange={(v) => onToggleNotif('notif_weekly', v, setNotifWeekly)}
              trackColor={{ true: Colors.primary, false: Colors.surfaceVariant }}
            />
          </View>
          <View className="h-[1px] bg-outline-variant" />
          <View className="flex-row justify-between items-center py-[10px]">
            <Text className="font-inter text-body-standard text-on-surface">Monthly summary</Text>
            <Switch
              value={notifMonthly}
              onValueChange={(v) => onToggleNotif('notif_monthly', v, setNotifMonthly)}
              trackColor={{ true: Colors.primary, false: Colors.surfaceVariant }}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
