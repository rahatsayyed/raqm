import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Colors } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import { useHiddenBalanceStore, type MaskedKind } from '../../store/hiddenBalanceStore';

const ROWS: [MaskedKind, string][] = [
  ['net', 'Net this month'],
  ['income', 'Income totals'],
  ['expense', 'Spending totals'],
  ['bank_balance', 'Bank balances'],
];

export function HideBalancesScreen({ navigation }: MainStackScreenProps<'HideBalances'>) {
  // The store hydrates from `app_settings` (hide_income/hide_expense/hide_net/
  // hide_bank_balances) at bundle-eval time and is already the source of truth
  // for every on-screen MaskedValue, so reading it here needs no extra
  // getSetting calls or focus-triggered reload of its own.
  const hiddenBalances = useHiddenBalanceStore((s) => s.hidden);
  const setHiddenBalance = useHiddenBalanceStore((s) => s.setHidden);

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="p-container-margin pt-sm pb-[40px]" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-md">
          <Text className="font-inter text-body-md text-primary">← Back</Text>
        </TouchableOpacity>
        <Text className="font-inter-bold text-headline-sm text-on-surface mb-lg">Hide Balances</Text>

        <Text className="font-inter text-supporting-text text-on-surface-variant mb-sm">
          Hidden figures show as **** until you tap them and confirm it's you. Once
          confirmed, the rest of the session needs no further confirmation.
        </Text>
        <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md">
          {ROWS.map(([kind, label], i) => (
            <View
              key={kind}
              className={`flex-row justify-between items-center py-[10px] ${i < ROWS.length - 1 ? 'border-b border-outline-variant' : ''}`}
            >
              <Text className="font-inter text-body-standard text-on-surface flex-1 pr-md">{label}</Text>
              <Switch
                value={hiddenBalances[kind]}
                onValueChange={(value) => { void setHiddenBalance(kind, value); }}
                trackColor={{ true: Colors.primary, false: Colors.surfaceVariant }}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
