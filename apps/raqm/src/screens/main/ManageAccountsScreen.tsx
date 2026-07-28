import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MainStackScreenProps } from '../../navigation/types';
import {
  getAccounts, setAccountHidden, mergeAccounts, updateAccount, type Account,
} from '../../db/database';
import { useTxStore } from '../../store/txStore';
import { AddAccountModal } from '../../components/AddAccountModal';
import { EditFieldSheet } from '../../components/EditFieldSheet';
import { Colors } from '../../theme';
import { AddIcon, BankIcon, ChevronRightIcon, WalletIcon, MergeIcon, PencilIcon } from '../../components/TabIcon';
import { formatAmount } from '../../utils/format';

function accountLabel(account: Account): string {
  return account.nickname || account.bankName;
}

export function ManageAccountsScreen({ navigation }: MainStackScreenProps<'ManageAccounts'>) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [mergeSource, setMergeSource] = useState<Account | null>(null);
  const [aliasTarget, setAliasTarget] = useState<Account | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setAccounts(await getAccounts());
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleHide = async (account: Account) => {
    setBusyId(account.id);
    try {
      await setAccountHidden(account.id, account.hiddenAt == null);
      await load();
      await useTxStore.getState().refresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleMergeConfirm = (target: Account) => {
    if (!mergeSource) return;
    const source = mergeSource;
    setMergeSource(null);
    Alert.alert(
      'Merge accounts',
      `All of "${accountLabel(source)}"'s transactions will move to "${accountLabel(target)}", and "${accountLabel(source)}" will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Merge',
          style: 'destructive',
          onPress: async () => {
            setBusyId(source.id);
            try {
              await mergeAccounts(source.id, target.id);
              await load();
              await useTxStore.getState().refresh();
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-background p-container-margin">
      <View className="flex-row items-center justify-between mt-sm">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="font-inter text-body-md text-primary">← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-row items-center gap-xs" onPress={() => setAddVisible(true)} hitSlop={8}>
          <AddIcon color={Colors.primary} size={18} />
          <Text className="font-inter-medium text-body-md text-primary">Add</Text>
        </TouchableOpacity>
      </View>
      <Text className="font-inter-bold text-headline-sm text-on-surface mt-md mb-md">Accounts</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-md pb-[32px]">
        {loaded && accounts.length === 0 && (
          <View className="pt-[60px] items-center">
            <Text className="font-inter text-body-md text-on-surface-variant">
              No accounts yet — they're auto-detected from SMS, or add one manually.
            </Text>
          </View>
        )}
        {accounts.map((account) => {
          const hidden = account.hiddenAt != null;
          const busy = busyId === account.id;
          return (
            <View
              key={account.id}
              className={`bg-surface-container-lowest rounded-xl border border-outline-variant p-lg ${hidden ? 'opacity-50' : ''}`}
            >
              <TouchableOpacity
                className="flex-row items-center gap-sm"
                activeOpacity={0.6}
                onPress={() => navigation.navigate('AccountDetail', { bankName: account.bankName, last4: account.last4 ?? undefined })}
              >
                <BankIcon color={Colors.inkLabel} size={20} />
                <View className="flex-1">
                  <Text className="font-inter-medium text-body-standard text-on-surface" numberOfLines={1}>
                    {accountLabel(account)}
                  </Text>
                  <Text className="font-inter text-annotation text-on-surface-variant mt-[2px]">
                    {account.bankName}{account.last4 ? ` · xx${account.last4}` : ''}{account.isCard ? ' · Card' : ''}{hidden ? ' · Hidden' : ''}
                  </Text>
                </View>
                {account.balance != null && (
                  <Text className="font-mono-medium text-numeric-sm text-on-surface mr-xs">{formatAmount(account.balance)}</Text>
                )}
                <ChevronRightIcon color={Colors.inkLabel} size={18} />
              </TouchableOpacity>

              <View className="flex-row gap-sm mt-md pt-md border-t border-outline-variant">
                <TouchableOpacity
                  className="flex-1 flex-row items-center justify-center gap-xs py-sm rounded-lg bg-surface-variant"
                  onPress={busy ? undefined : () => setAliasTarget(account)}
                >
                  <PencilIcon color={Colors.onSurfaceVariant} size={14} />
                  <Text className="font-inter-medium text-annotation text-on-surface-variant">Alias</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 flex-row items-center justify-center gap-xs py-sm rounded-lg bg-surface-variant"
                  onPress={busy ? undefined : () => handleHide(account)}
                >
                  <WalletIcon color={Colors.onSurfaceVariant} size={14} />
                  <Text className="font-inter-medium text-annotation text-on-surface-variant">{hidden ? 'Unhide' : 'Hide'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 flex-row items-center justify-center gap-xs py-sm rounded-lg bg-surface-variant"
                  onPress={busy ? undefined : () => setMergeSource(account)}
                >
                  <MergeIcon color={Colors.onSurfaceVariant} size={14} />
                  <Text className="font-inter-medium text-annotation text-on-surface-variant">Merge</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <AddAccountModal visible={addVisible} onClose={() => setAddVisible(false)} onAdded={load} />

      <EditFieldSheet
        visible={aliasTarget != null}
        onClose={() => setAliasTarget(null)}
        title="Edit account alias"
        placeholder={aliasTarget?.bankName}
        initialValue={aliasTarget?.nickname ?? ''}
        onConfirm={async (value) => {
          if (aliasTarget) await updateAccount(aliasTarget.id, { nickname: value || null });
          setAliasTarget(null);
          await load();
          await useTxStore.getState().refresh();
        }}
      />

      <Modal visible={mergeSource != null} transparent animationType="fade" onRequestClose={() => setMergeSource(null)}>
        <TouchableOpacity className="flex-1 bg-black/60 justify-center p-lg" activeOpacity={1} onPress={() => setMergeSource(null)}>
          <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg max-h-[70%]">
            <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-md">
              Merge "{mergeSource ? accountLabel(mergeSource) : ''}" into…
            </Text>
            <FlatList
              data={accounts.filter((a) => a.id !== mergeSource?.id)}
              keyExtractor={(a) => String(a.id)}
              ItemSeparatorComponent={() => <View className="h-[1px] bg-outline-variant" />}
              ListEmptyComponent={<Text className="font-inter text-body-sm text-on-surface-variant py-md">No other accounts to merge into.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity className="py-md" onPress={() => handleMergeConfirm(item)}>
                  <Text className="font-inter-medium text-body-standard text-on-surface">{accountLabel(item)}</Text>
                  <Text className="font-inter text-annotation text-on-surface-variant mt-[2px]">
                    {item.bankName}{item.last4 ? ` · xx${item.last4}` : ''}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
