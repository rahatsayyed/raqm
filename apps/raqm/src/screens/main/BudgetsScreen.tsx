import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import { getSetting, setSetting, getCategories, getBudgets, upsertBudget, deleteBudget, type Category, type Budget } from '../../db/database';

export function BudgetsScreen({ navigation }: MainStackScreenProps<'Budgets'>) {
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [drafts, setDrafts] = useState<Record<number, { amount: string; periodType: 'monthly' | 'weekly'; rollover: boolean }>>({});

  const reload = useCallback(async () => {
    const [alerts, cats, buds] = await Promise.all([
      getSetting('budget_alerts'),
      getCategories('expense'), // budgets are an expense-control concept — Salary/Interest/etc. don't apply
      getBudgets(),
    ]);
    setBudgetAlerts(alerts !== '0');
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

  // This screen stays mounted beneath pushed screens (e.g. CategoryPicker reached from
  // elsewhere), so a mount-only read can show stale categories/budgets when the user comes
  // back here — same class of bug fixed for the old combined SettingsScreen.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  async function onToggleBudgetAlerts(value: boolean) {
    setBudgetAlerts(value);
    await setSetting('budget_alerts', value ? '1' : '0');
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
        <Text className="font-inter-bold text-headline-sm text-on-surface mb-lg">Budgets</Text>

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
      </ScrollView>
    </View>
  );
}
