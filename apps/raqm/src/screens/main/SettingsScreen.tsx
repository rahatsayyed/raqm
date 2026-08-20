import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, TextInput, Modal, FlatList, Alert } from 'react-native';
import { Colors } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import { getSetting, setSetting, getCategories, getBudgets, upsertBudget, deleteBudget, type Category, type Budget } from '../../db/database';
import { scheduleSummaries } from '../../notifications/notifications';
import { canUseDeviceAuth, isAppLockEnabled, setAppLockEnabled } from '../../services/auth/appLock';

const MONTH_START_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

export function SettingsScreen({ navigation }: MainStackScreenProps<'Settings'>) {
  const [monthStartDay, setMonthStartDay] = useState(1);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [notifDaily, setNotifDaily] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(true);
  const [notifMonthly, setNotifMonthly] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [appLock, setAppLock] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [drafts, setDrafts] = useState<Record<number, { amount: string; periodType: 'monthly' | 'weekly'; rollover: boolean }>>({});

  const reload = useCallback(async () => {
    const [day, daily, weekly, monthly, alerts, appLockOn, cats, buds] = await Promise.all([
      getSetting('month_start_day'),
      getSetting('notif_daily'),
      getSetting('notif_weekly'),
      getSetting('notif_monthly'),
      getSetting('budget_alerts'),
      isAppLockEnabled(),
      getCategories('expense'), // budgets are an expense-control concept — Salary/Interest/etc. don't apply
      getBudgets(),
    ]);
    setMonthStartDay(day ? Number(day) : 1);
    setNotifDaily(daily !== '0');
    setNotifWeekly(weekly !== '0');
    setNotifMonthly(monthly !== '0');
    setBudgetAlerts(alerts !== '0');
    setAppLock(appLockOn);
    setCategories(cats);
    setBudgets(buds);
    const nextDrafts: Record<number, { amount: string; periodType: 'monthly' | 'weekly'; rollover: boolean }> = {};
    for (const cat of cats) {
      const existing = buds.find((b) => b.categoryId === cat.id);
      nextDrafts[cat.id] = {
        amount: existing ? String(existing.amount) : '',
        periodType: existing?.periodType ?? 'monthly',
        rollover: existing?.rollover ?? false,
      };
    }
    setDrafts(nextDrafts);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function onSelectMonthStartDay(day: number) {
    setMonthStartDay(day);
    setShowDayPicker(false);
    await setSetting('month_start_day', String(day));
  }

  async function onToggleNotif(key: 'notif_daily' | 'notif_weekly' | 'notif_monthly', value: boolean, setter: (v: boolean) => void) {
    setter(value);
    await setSetting(key, value ? '1' : '0');
    await scheduleSummaries();
  }

  async function onToggleBudgetAlerts(value: boolean) {
    setBudgetAlerts(value);
    await setSetting('budget_alerts', value ? '1' : '0');
  }

  // Turning ON requires a usable device credential — otherwise the lock screen
  // would have no way to be unlocked. Turning OFF is immediate and needs no
  // confirmation: the user already passed the lock to reach Settings.
  async function onToggleAppLock(value: boolean) {
    if (value) {
      const usable = await canUseDeviceAuth();
      if (!usable) {
        Alert.alert(
          'No screen lock found',
          "Set up a fingerprint, PIN, pattern or password in your phone's settings first, then turn on App Lock.",
        );
        return;
      }
    }
    setAppLock(value);
    await setAppLockEnabled(value);
  }

  function updateDraft(categoryId: number, patch: Partial<{ amount: string; periodType: 'monthly' | 'weekly'; rollover: boolean }>) {
    setDrafts((prev) => ({ ...prev, [categoryId]: { ...prev[categoryId], ...patch } }));
  }

  // `patch` carries the value that was just changed — reading it from `drafts`
  // here would see the pre-setState closure value and persist stale data.
  async function saveBudget(
    categoryId: number,
    patch?: Partial<{ amount: string; periodType: 'monthly' | 'weekly'; rollover: boolean }>,
  ) {
    const base = drafts[categoryId] ?? { amount: '', periodType: 'monthly' as const, rollover: false };
    const draft = { ...base, ...patch };
    const amount = Number(draft.amount);
    if (!draft.amount || Number.isNaN(amount) || amount <= 0) {
      const existing = budgets.find((b) => b.categoryId === categoryId);
      if (existing) {
        await deleteBudget(existing.id);
        setBudgets((prev) => prev.filter((b) => b.id !== existing.id));
      }
      return;
    }
    await upsertBudget(categoryId, amount, draft.periodType, draft.rollover);
    // Refresh only the budgets list — a full reload() would rebuild every draft
    // and clobber unsaved text a user may have typed in another category's field.
    const buds = await getBudgets();
    setBudgets(buds);
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="p-container-margin pt-sm pb-[40px]" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-md">
          <Text className="font-inter text-body-md text-primary">← Back</Text>
        </TouchableOpacity>
        <Text className="font-inter-bold text-headline-sm text-on-surface mb-lg">Settings</Text>

        {/* PERIOD */}
        <Text className="font-inter-semibold text-section-header text-on-surface-variant mt-lg mb-sm">PERIOD</Text>
        <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md">
          <TouchableOpacity className="flex-row justify-between items-center py-[10px]" onPress={() => setShowDayPicker(true)}>
            <Text className="font-inter text-body-standard text-on-surface">Month start day</Text>
            <Text className="font-mono text-numeric-sm text-primary">{monthStartDay}</Text>
          </TouchableOpacity>
        </View>

        {/* NOTIFICATIONS */}
        <Text className="font-inter-semibold text-section-header text-on-surface-variant mt-lg mb-sm">NOTIFICATIONS</Text>
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

        {/* BUDGETS */}
        <Text className="font-inter-semibold text-section-header text-on-surface-variant mt-lg mb-sm">BUDGETS</Text>
        <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md">
          <View className="flex-row justify-between items-center py-[10px]">
            <Text className="font-inter text-body-standard text-on-surface">Budget alerts</Text>
            <Switch
              value={budgetAlerts}
              onValueChange={onToggleBudgetAlerts}
              trackColor={{ true: Colors.primary, false: Colors.surfaceVariant }}
            />
          </View>
          <View className="h-[1px] bg-outline-variant" />
          {categories.map((cat) => {
            const draft = drafts[cat.id] ?? { amount: '', periodType: 'monthly' as const, rollover: false };
            return (
              <View key={cat.id} className="py-sm border-b border-outline-variant gap-xs">
                <Text className="font-inter text-body-standard text-on-surface">{cat.emoji} {cat.name}</Text>
                <View className="flex-row gap-sm items-center">
                  <TextInput
                    className="flex-1 border border-outline-variant rounded-md px-sm py-[8px] text-on-surface font-inter text-body-sm"
                    placeholder="Amount"
                    placeholderTextColor={Colors.onSurfaceVariant}
                    keyboardType="numeric"
                    value={draft.amount}
                    onChangeText={(t) => updateDraft(cat.id, { amount: t })}
                    onBlur={() => saveBudget(cat.id)}
                  />
                  <View className="flex-row rounded-md overflow-hidden border border-outline-variant">
                    {(['monthly', 'weekly'] as const).map((p) => (
                      <TouchableOpacity
                        key={p}
                        className={`py-[8px] px-[12px] ${draft.periodType === p ? 'bg-primary' : 'bg-surface-container-lowest'}`}
                        onPress={() => {
                          updateDraft(cat.id, { periodType: p });
                          saveBudget(cat.id, { periodType: p });
                        }}
                      >
                        <Text className={`font-mono text-label-sm tracking-[0px] ${draft.periodType === p ? 'text-on-primary font-inter-medium' : 'text-on-surface-variant'}`}>
                          {p === 'monthly' ? 'Mo' : 'Wk'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                {draft.periodType === 'weekly' && (
                  <View className="flex-row justify-between items-center pt-[4px]">
                    <Text className="font-inter text-supporting-text text-on-surface-variant">Rollover unused amount</Text>
                    <Switch
                      value={draft.rollover}
                      onValueChange={(v) => {
                        updateDraft(cat.id, { rollover: v });
                        saveBudget(cat.id, { rollover: v });
                      }}
                      trackColor={{ true: Colors.primary, false: Colors.surfaceVariant }}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* SECURITY */}
        <Text className="font-inter-semibold text-section-header text-on-surface-variant mt-lg mb-sm">SECURITY</Text>
        <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md">
          <View className="flex-row justify-between items-center py-[10px]">
            <View className="flex-1 pr-md">
              <Text className="font-inter text-body-standard text-on-surface">App Lock</Text>
              <Text className="font-inter text-supporting-text text-on-surface-variant">
                Require your fingerprint, PIN or pattern to open Raqm
              </Text>
            </View>
            <Switch
              value={appLock}
              onValueChange={onToggleAppLock}
              trackColor={{ true: Colors.primary, false: Colors.surfaceVariant }}
            />
          </View>
        </View>

        {/* APPEARANCE */}
        <Text className="font-inter-semibold text-section-header text-on-surface-variant mt-lg mb-sm">APPEARANCE</Text>
        <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md">
          <View className="flex-row justify-between items-center py-[10px] opacity-50">
            <Text className="font-inter text-body-standard text-on-surface-variant">Light theme — coming soon</Text>
            <Switch value={false} disabled trackColor={{ true: Colors.primary, false: Colors.surfaceVariant }} />
          </View>
        </View>
      </ScrollView>

      <Modal visible={showDayPicker} transparent animationType="fade" onRequestClose={() => setShowDayPicker(false)}>
        <TouchableOpacity className="flex-1 bg-black/60 justify-center p-lg" activeOpacity={1} onPress={() => setShowDayPicker(false)}>
          <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg">
            <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-md">Month start day</Text>
            <FlatList
              data={MONTH_START_DAYS}
              keyExtractor={(d) => String(d)}
              numColumns={7}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className={`flex-1 aspect-square m-[2px] rounded-sm items-center justify-center ${item === monthStartDay ? 'bg-primary' : 'bg-surface-container'}`}
                  onPress={() => onSelectMonthStartDay(item)}
                >
                  <Text className={`font-mono text-label-sm tracking-[0px] ${item === monthStartDay ? 'text-on-primary font-inter-medium' : 'text-on-surface-variant'}`}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
