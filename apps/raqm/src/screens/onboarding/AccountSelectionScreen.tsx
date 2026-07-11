import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useOnboardingStore } from '../../store/onboardingStore';
import { softDeleteAccountTxs } from '../../db/database';

type Account = { id: string; bank: string; last4: string | null; type: string; icon: string; txCount: number };

export function AccountSelectionScreen({ navigation }: OnboardingScreenProps<'AccountSelection'>) {
  const { transactions } = useOnboardingStore();

  const accounts = useMemo<Account[]>(() => {
    const map = new Map<string, Account>();
    for (const tx of transactions) {
      const key = `${tx.bankName}|${tx.accountLast4 ?? 'unknown'}`;
      if (map.has(key)) {
        map.get(key)!.txCount += 1;
      } else {
        map.set(key, {
          id: key,
          bank: tx.bankName,
          last4: tx.accountLast4,
          type: tx.isFromCard ? 'Credit Card' : 'Bank Account',
          icon: tx.isFromCard ? '💳' : '🏦',
          txCount: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.txCount - a.txCount);
  }, [transactions]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(accounts.map(a => a.id)));

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalTx = accounts.filter(a => selected.has(a.id)).reduce((s, a) => s + a.txCount, 0);

  if (accounts.length === 0) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-container-margin gap-md">
        <Text className="text-[56px]">🔍</Text>
        <Text className="font-inter-semibold text-headline-md text-on-surface text-center">No accounts detected</Text>
        <Text className="font-inter text-body-md text-on-surface-variant text-center">
          We couldn't find any bank transactions in your SMS. Make sure Read SMS permission was granted and try scanning again.
        </Text>
        <PrimaryButton
          label="Go back"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 24, width: '100%' }}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="px-container-margin pt-[48px] pb-xl" showsVerticalScrollIndicator={false}>
        <View className="h-[4px] bg-surface-variant rounded-full mb-xxl">
          <View className="w-[80%] h-full bg-primary rounded-full" />
        </View>

        <Text className="font-inter-bold text-display-lg text-on-surface mb-sm">Your accounts</Text>
        <Text className="font-inter text-body-md text-on-surface-variant mb-xl">
          We detected {accounts.length} account{accounts.length !== 1 ? 's' : ''} from your messages. Select the ones to include.
        </Text>

        <View className="gap-sm mb-xl">
          {accounts.map(account => {
            const isSelected = selected.has(account.id);
            return (
              <TouchableOpacity
                key={account.id}
                className={`flex-row items-center gap-md bg-surface-container-lowest border rounded-xl p-md ${isSelected ? 'border-primary bg-primary-container' : 'border-outline-variant'}`}
                onPress={() => toggle(account.id)}
                activeOpacity={0.8}
              >
                <View className={`w-[48px] h-[48px] rounded-lg items-center justify-center ${isSelected ? 'bg-primary/[0.08]' : 'bg-surface-variant'}`}>
                  <Text className="text-[22px]">{account.icon}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-inter-bold text-title-lg text-on-surface">{account.bank}</Text>
                  <Text className="font-inter text-body-sm text-on-surface-variant mt-[2px]">
                    {account.type}
                    {account.last4 ? ` •••• ${account.last4}` : ''} · {account.txCount} txns
                  </Text>
                </View>
                <View className={`w-[24px] h-[24px] rounded-[6px] border-2 items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-outline'}`}>
                  {isSelected && <Text className="text-on-primary text-[13px] font-bold">✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View className="bg-primary-container rounded-xl p-md items-center">
          <Text className="font-inter text-body-md text-on-primary-container text-center">
            <Text className="font-inter-bold text-primary">{totalTx}</Text> transactions across{' '}
            <Text className="font-inter-bold text-primary">{selected.size}</Text> account{selected.size !== 1 ? 's' : ''} selected
          </Text>
        </View>
      </ScrollView>

      <View className="px-container-margin pb-[32px] pt-md">
        <PrimaryButton
          label={`Continue with ${selected.size} account${selected.size !== 1 ? 's' : ''}`}
          onPress={async () => {
            // Deselected accounts: soft-delete their transactions — recoverable later from
            // More → Deleted transactions or the account's Re-add action.
            try {
              for (const acc of accounts) {
                if (!selected.has(acc.id)) {
                  await softDeleteAccountTxs(acc.bank, acc.last4 ?? null);
                }
              }
            } catch (e) {
              // Non-fatal: nothing is lost — proceed rather than stranding the user here.
              console.warn('Deselect cleanup failed:', e);
            }
            navigation.replace('ScanComplete');
          }}
          disabled={selected.size === 0}
        />
      </View>
    </View>
  );
}
