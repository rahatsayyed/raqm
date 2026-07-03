import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, Modal, FlatList } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import { getSetting, setSetting, getCategories, getBudgets, upsertBudget, deleteBudget, type Category, type Budget } from '../../db/database';
import { scheduleSummaries } from '../../notifications/notifications';

const MONTH_START_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

export function SettingsScreen({ navigation }: MainStackScreenProps<'Settings'>) {
  const [monthStartDay, setMonthStartDay] = useState(1);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [notifDaily, setNotifDaily] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(true);
  const [notifMonthly, setNotifMonthly] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [drafts, setDrafts] = useState<Record<number, { amount: string; periodType: 'monthly' | 'weekly'; rollover: boolean }>>({});

  const reload = useCallback(async () => {
    const [day, daily, weekly, monthly, alerts, cats, buds] = await Promise.all([
      getSetting('month_start_day'),
      getSetting('notif_daily'),
      getSetting('notif_weekly'),
      getSetting('notif_monthly'),
      getSetting('budget_alerts'),
      getCategories(),
      getBudgets(),
    ]);
    setMonthStartDay(day ? Number(day) : 1);
    setNotifDaily(daily !== '0');
    setNotifWeekly(weekly !== '0');
    setNotifMonthly(monthly !== '0');
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
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>

        {/* PERIOD */}
        <Text style={styles.sectionHeader}>PERIOD</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => setShowDayPicker(true)}>
            <Text style={styles.rowLabel}>Month start day</Text>
            <Text style={styles.rowValue}>{monthStartDay}</Text>
          </TouchableOpacity>
        </View>

        {/* NOTIFICATIONS */}
        <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Daily summary</Text>
            <Switch
              value={notifDaily}
              onValueChange={(v) => onToggleNotif('notif_daily', v, setNotifDaily)}
              trackColor={{ true: Colors.primary, false: Colors.surfaceVariant }}
            />
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Weekly summary</Text>
            <Switch
              value={notifWeekly}
              onValueChange={(v) => onToggleNotif('notif_weekly', v, setNotifWeekly)}
              trackColor={{ true: Colors.primary, false: Colors.surfaceVariant }}
            />
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Monthly summary</Text>
            <Switch
              value={notifMonthly}
              onValueChange={(v) => onToggleNotif('notif_monthly', v, setNotifMonthly)}
              trackColor={{ true: Colors.primary, false: Colors.surfaceVariant }}
            />
          </View>
        </View>

        {/* BUDGETS */}
        <Text style={styles.sectionHeader}>BUDGETS</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Budget alerts</Text>
            <Switch
              value={budgetAlerts}
              onValueChange={onToggleBudgetAlerts}
              trackColor={{ true: Colors.primary, false: Colors.surfaceVariant }}
            />
          </View>
          <View style={styles.rowDivider} />
          {categories.map((cat) => {
            const draft = drafts[cat.id] ?? { amount: '', periodType: 'monthly' as const, rollover: false };
            return (
              <View key={cat.id} style={styles.budgetRow}>
                <Text style={styles.budgetCatName}>{cat.emoji} {cat.name}</Text>
                <View style={styles.budgetInputRow}>
                  <TextInput
                    style={styles.budgetInput}
                    placeholder="Amount"
                    placeholderTextColor={Colors.onSurfaceVariant}
                    keyboardType="numeric"
                    value={draft.amount}
                    onChangeText={(t) => updateDraft(cat.id, { amount: t })}
                    onBlur={() => saveBudget(cat.id)}
                  />
                  <View style={styles.segmented}>
                    {(['monthly', 'weekly'] as const).map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[styles.segmentBtn, draft.periodType === p && styles.segmentBtnActive]}
                        onPress={() => {
                          updateDraft(cat.id, { periodType: p });
                          saveBudget(cat.id, { periodType: p });
                        }}
                      >
                        <Text style={[styles.segmentText, draft.periodType === p && styles.segmentTextActive]}>
                          {p === 'monthly' ? 'Mo' : 'Wk'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                {draft.periodType === 'weekly' && (
                  <View style={styles.rolloverRow}>
                    <Text style={styles.rolloverLabel}>Rollover unused amount</Text>
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

        {/* APPEARANCE */}
        <Text style={styles.sectionHeader}>APPEARANCE</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.rowDisabled]}>
            <Text style={[styles.rowLabel, styles.rowLabelDisabled]}>Light theme — coming soon</Text>
            <Switch value={false} disabled trackColor={{ true: Colors.primary, false: Colors.surfaceVariant }} />
          </View>
        </View>
      </ScrollView>

      <Modal visible={showDayPicker} transparent animationType="fade" onRequestClose={() => setShowDayPicker(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowDayPicker(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Month start day</Text>
            <FlatList
              data={MONTH_START_DAYS}
              keyExtractor={(d) => String(d)}
              numColumns={7}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.dayCell, item === monthStartDay && styles.dayCellActive]}
                  onPress={() => onSelectMonthStartDay(item)}
                >
                  <Text style={[styles.dayCellText, item === monthStartDay && styles.dayCellTextActive]}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.containerMargin, paddingBottom: 40 },
  back: { marginBottom: Spacing.md },
  backText: { ...Typography.bodyMd, color: Colors.primary },
  title: { ...Typography.headlineSm, color: Colors.onSurface, marginBottom: Spacing.lg },

  sectionHeader: { ...Typography.sectionHeader, color: Colors.onSurfaceVariant, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant, padding: Spacing.md },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  rowDisabled: { opacity: 0.5 },
  rowLabel: { ...Typography.bodyStandard, color: Colors.onSurface },
  rowLabelDisabled: { color: Colors.onSurfaceVariant },
  rowValue: { ...Typography.numericSm, color: Colors.primary },
  rowDivider: { height: 1, backgroundColor: Colors.outlineVariant },

  budgetRow: { paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant, gap: Spacing.xs },
  budgetCatName: { ...Typography.bodyStandard, color: Colors.onSurface },
  budgetInputRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  budgetInput: { flex: 1, borderWidth: 1, borderColor: Colors.outlineVariant, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, paddingVertical: 8, color: Colors.onSurface, ...Typography.bodySm },
  segmented: { flexDirection: 'row', borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.outlineVariant },
  segmentBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: Colors.surfaceContainerLowest },
  segmentBtnActive: { backgroundColor: Colors.primary },
  segmentText: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0 },
  segmentTextActive: { color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },
  rolloverRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  rolloverLabel: { ...Typography.supportingText, color: Colors.onSurfaceVariant },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: Spacing.lg },
  modalCard: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant, padding: Spacing.lg },
  modalTitle: { ...Typography.titleLg, color: Colors.onSurface, marginBottom: Spacing.md, fontSize: 16 },
  dayCell: { flex: 1, aspectRatio: 1, margin: 2, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceContainer },
  dayCellActive: { backgroundColor: Colors.primary },
  dayCellText: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0 },
  dayCellTextActive: { color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },
});
