import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Switch, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { getSetting, setSetting, getCategories, getBudgets, upsertBudget, deleteBudget, type Category, type Budget } from '../../db/database';

const PLANNED_MONTHLY_EXPENSE_KEY = 'planned_monthly_expense';

type Draft = { amount: string; rollover: boolean };
const EMPTY_DRAFT: Draft = { amount: '', rollover: false };

export function BudgetsScreen({ navigation }: MainStackScreenProps<'Budgets'>) {
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  // Top-level "planned monthly spend" — an overall target independent of per-category
  // budgets. Dashboard's Safe-to-Spend card uses this (when set) instead of summing only
  // budgeted categories, since that sum silently ignores spend in unbudgeted categories.
  const [plannedExpense, setPlannedExpense] = useState('');

  const reload = useCallback(async () => {
    const [alerts, cats, buds, planned] = await Promise.all([
      getSetting('budget_alerts'),
      getCategories('expense'), // budgets are an expense-control concept — Salary/Interest/etc. don't apply
      getBudgets(),
      getSetting(PLANNED_MONTHLY_EXPENSE_KEY),
    ]);
    setBudgetAlerts(alerts !== '0');
    setCategories(cats);
    setBudgets(buds);
    setPlannedExpense(planned ?? '');
    const nextDrafts: Record<number, Draft> = {};
    for (const cat of cats) {
      const existing = buds.find((b) => b.categoryId === cat.id);
      nextDrafts[cat.id] = {
        amount: existing ? String(existing.amount) : '',
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

  async function savePlannedExpense() {
    const amount = Number(plannedExpense);
    if (!plannedExpense || Number.isNaN(amount) || amount <= 0) {
      // Empty/invalid clears the plan — Dashboard falls back to the per-category-budget sum.
      setPlannedExpense('');
      await setSetting(PLANNED_MONTHLY_EXPENSE_KEY, '');
      return;
    }
    await setSetting(PLANNED_MONTHLY_EXPENSE_KEY, String(amount));
  }

  function updateDraft(categoryId: number, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [categoryId]: { ...(prev[categoryId] ?? EMPTY_DRAFT), ...patch } }));
  }

  // `patch` carries the value that was just changed — reading it from `drafts`
  // here would see the pre-setState closure value and persist stale data.
  async function saveBudget(categoryId: number, patch?: Partial<Draft>) {
    const base = drafts[categoryId] ?? EMPTY_DRAFT;
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
    await upsertBudget(categoryId, amount, draft.rollover);
    // Refresh only the budgets list — a full reload() would rebuild every draft
    // and clobber unsaved text a user may have typed in another category's field.
    const buds = await getBudgets();
    setBudgets(buds);
  }

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-container-margin pt-sm pb-[40px]"
      enableOnAndroid
      extraScrollHeight={Spacing.lg}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity onPress={() => navigation.goBack()} className="mb-md">
        <Text className="font-inter text-body-md text-primary">← Back</Text>
      </TouchableOpacity>
      <Text className="font-inter-bold text-headline-sm text-on-surface mb-lg">Budgets</Text>

      <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md mb-lg">
        <Text className="font-inter-medium text-body-standard text-on-surface mb-[4px]">Monthly plan</Text>
        <Text className="font-inter text-supporting-text text-on-surface-variant mb-sm">
          Overall spend target for the month. Dashboard's Safe to Spend uses this instead of
          just the categories below, so unbudgeted spending isn't ignored.
        </Text>
        <TextInput
          className="border border-outline-variant rounded-md px-sm py-[8px] text-on-surface font-inter text-body-sm"
          placeholder="e.g. 30000"
          placeholderTextColor={Colors.onSurfaceVariant}
          keyboardType="numeric"
          value={plannedExpense}
          onChangeText={setPlannedExpense}
          onBlur={savePlannedExpense}
        />
      </View>

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
            const draft = drafts[cat.id] ?? EMPTY_DRAFT;
            return (
              <View key={cat.id} className="py-sm border-b border-outline-variant gap-xs">
                <Text className="font-inter text-body-standard text-on-surface">{cat.emoji} {cat.name}</Text>
                <TextInput
                  className="border border-outline-variant rounded-md px-sm py-[8px] text-on-surface font-inter text-body-sm"
                  placeholder="Amount per cycle"
                  placeholderTextColor={Colors.onSurfaceVariant}
                  keyboardType="numeric"
                  value={draft.amount}
                  onChangeText={(t) => updateDraft(cat.id, { amount: t })}
                  onBlur={() => saveBudget(cat.id)}
                />
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
              </View>
            );
          })}
        </View>
    </KeyboardAwareScrollView>
  );
}
