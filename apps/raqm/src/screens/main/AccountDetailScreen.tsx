import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Colors } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import { useTxStore } from '../../store/txStore';
import { getAccounts, updateAccount, softDeleteAccountTxs, restoreAccountTxs, loadDeletedTxRecords, Account } from '../../db/database';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import type { TxRecord } from '../../db/database';
import { formatAmount } from '../../utils/format';
import { rescanTransactions } from '../../services/rescan';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isDebit(type: TransactionType): boolean {
  return type === TransactionType.EXPENSE || type === TransactionType.TRANSFER || type === TransactionType.INVESTMENT;
}

function txColor(type: TransactionType): string {
  switch (type) {
    case TransactionType.INCOME:
    case TransactionType.CREDIT: return Colors.primary;
    case TransactionType.EXPENSE: return Colors.error;
    default: return Colors.onSurfaceVariant;
  }
}

export function AccountDetailScreen({ route, navigation }: MainStackScreenProps<'AccountDetail'>) {
  const { bankName, last4 } = route.params;
  const txs = useTxStore(s => s.txs);
  const [account, setAccount] = useState<Account | null>(null);
  const [nickname, setNickname] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const accountTxs = useMemo(
    () => txs.filter(t => t.bankName === bankName && (t.accountLast4 ?? '') === (last4 ?? '')),
    [txs, bankName, last4],
  );

  const isCard = account?.isCard ?? accountTxs.some(t => t.isFromCard);
  const currency = accountTxs[0]?.currency ?? '₹';

  const lastBalanceTx = useMemo(
    () => accountTxs.find(t => t.balance != null),
    [accountTxs],
  );

  const outstanding = useMemo(() => {
    if (!account?.creditLimit || lastBalanceTx?.balance == null) return null;
    return account.creditLimit - lastBalanceTx.balance;
  }, [account, lastBalanceTx]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const accounts = await getAccounts();
      const match = accounts.find(a => a.bankName === bankName && (a.last4 ?? '') === (last4 ?? '')) ?? null;
      if (cancelled) return;
      setAccount(match);
      setNickname(match?.nickname ?? '');
      setCreditLimit(match?.creditLimit != null ? String(match.creditLimit) : '');
      setDueDate(match?.dueDate ?? '');
    })();
    return () => { cancelled = true; };
  }, [bankName, last4]);

  const handleSave = async () => {
    if (!account) return;
    setSaving(true);
    try {
      const parsedLimit = Number(creditLimit.trim());
      await updateAccount(account.id, {
        nickname: nickname.trim() || null,
        creditLimit: creditLimit.trim() && Number.isFinite(parsedLimit) ? parsedLimit : null,
        dueDate: dueDate.trim() || null,
      });
      const accounts = await getAccounts();
      const refreshed = accounts.find(a => a.id === account.id) ?? null;
      setAccount(refreshed);
    } finally {
      setSaving(false);
    }
  };

  const [removedCount, setRemovedCount] = useState(0);
  const [accountBusy, setAccountBusy] = useState(false);

  const loadRemovedCount = async () => {
    const deleted = await loadDeletedTxRecords();
    setRemovedCount(
      deleted.filter(t => t.bankName === bankName && (t.accountLast4 ?? '') === (last4 ?? '')).length,
    );
  };

  useEffect(() => {
    loadRemovedCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankName, last4, txs]);

  const handleRemoveAll = () => {
    Alert.alert(
      'Remove all transactions?',
      `All ${accountTxs.length} transactions of this account will be moved to Deleted transactions. You can restore them any time, and scans will not re-add them.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove all',
          style: 'destructive',
          onPress: async () => {
            setAccountBusy(true);
            try {
              await softDeleteAccountTxs(bankName, last4 ?? null);
              await useTxStore.getState().refresh();
              await loadRemovedCount();
            } catch (e) {
              Alert.alert('Remove failed', e instanceof Error ? e.message : 'Unknown error');
            } finally {
              setAccountBusy(false);
            }
          },
        },
      ],
    );
  };

  const handleReAdd = () => {
    Alert.alert(
      'Re-add transactions?',
      `${removedCount} removed transaction${removedCount === 1 ? '' : 's'} will be restored with categories and notes intact, then the last 30 days are scanned for anything missing.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Re-add',
          onPress: async () => {
            setAccountBusy(true);
            try {
              await restoreAccountTxs(bankName, last4 ?? null);
              await rescanTransactions(); // missing-only, serialized; refreshes the store
              await loadRemovedCount();
            } catch (e) {
              Alert.alert('Re-add failed', e instanceof Error ? e.message : 'Unknown error');
            } finally {
              setAccountBusy(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="p-container-margin pt-sm pb-[40px]" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-md">
          <Text className="font-inter text-body-md text-primary">← Back</Text>
        </TouchableOpacity>

        <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg items-center gap-[4px] mb-lg">
          <Text className="text-[32px] mb-[4px]">{isCard ? '💳' : '🏦'}</Text>
          <Text className="font-inter-bold text-headline-sm text-on-surface">{account?.nickname || bankName}</Text>
          <Text className="font-inter text-body-md text-on-surface-variant">{last4 ? `•••• ${last4}` : 'Account'}</Text>
          <Text className="font-mono text-label-sm text-on-surface-variant mt-md">Last known balance</Text>
          <Text className="font-mono-medium text-numeric-xl text-on-surface">
            {lastBalanceTx?.balance != null ? formatAmount(lastBalanceTx.balance, currency) : '—'}
          </Text>
          {lastBalanceTx && (
            <Text className="font-mono text-label-sm text-outline">as of {formatDate(lastBalanceTx.timestamp)}</Text>
          )}
        </View>

        {isCard && (
          <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md mb-lg gap-sm">
            <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-sm">Card details</Text>
            <View className="gap-[4px]">
              <Text className="font-mono text-label-sm text-on-surface-variant">Nickname</Text>
              <TextInput
                className="font-inter text-body-md text-on-surface bg-surface-variant rounded-md px-sm py-[8px]"
                value={nickname}
                onChangeText={setNickname}
                placeholder="e.g. Everyday card"
                placeholderTextColor={Colors.outline}
              />
            </View>
            <View className="gap-[4px]">
              <Text className="font-mono text-label-sm text-on-surface-variant">Credit limit</Text>
              <TextInput
                className="font-inter text-body-md text-on-surface bg-surface-variant rounded-md px-sm py-[8px]"
                value={creditLimit}
                onChangeText={setCreditLimit}
                keyboardType="numeric"
                placeholder="e.g. 100000"
                placeholderTextColor={Colors.outline}
              />
            </View>
            <View className="gap-[4px]">
              <Text className="font-mono text-label-sm text-on-surface-variant">Due date</Text>
              <TextInput
                className="font-inter text-body-md text-on-surface bg-surface-variant rounded-md px-sm py-[8px]"
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="e.g. 5th of month"
                placeholderTextColor={Colors.outline}
              />
            </View>
            {outstanding != null && (
              <View className="flex-row justify-between mt-sm">
                <Text className="font-mono text-label-sm text-on-surface-variant">Outstanding</Text>
                <Text className="font-mono-medium text-[16px] leading-[28px] text-error">{formatAmount(outstanding, currency)}</Text>
              </View>
            )}
            <TouchableOpacity
              className="bg-primary rounded-lg py-[10px] items-center mt-sm"
              onPress={handleSave}
              disabled={saving || !account}
            >
              <Text className="font-inter-medium text-body-md text-on-primary">{saving ? 'Saving…' : 'Save card details'}</Text>
            </TouchableOpacity>
            {!account && (
              <Text className="font-mono text-label-sm text-outline mt-[4px]">Account row not found yet — it appears after the next scan or app restart.</Text>
            )}
          </View>
        )}

        {/* Account actions: remove-all soft-deletes (recoverable); re-add restores + fills missing */}
        <View>
          <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-sm">Manage</Text>
          <View className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
            {accountTxs.length > 0 && (
              <TouchableOpacity className="px-md py-[14px]" onPress={accountBusy ? undefined : handleRemoveAll}>
                <Text className="font-inter text-body-md text-error-muted">
                  {accountBusy ? 'Working…' : 'Remove all transactions'}
                </Text>
              </TouchableOpacity>
            )}
            {accountTxs.length > 0 && removedCount > 0 && <View className="h-[1px] bg-outline-variant" />}
            {removedCount > 0 && (
              <TouchableOpacity className="px-md py-[14px]" onPress={accountBusy ? undefined : handleReAdd}>
                <Text className="font-inter text-body-md text-primary">
                  {accountBusy ? 'Working…' : `Re-add ${removedCount} removed transaction${removedCount === 1 ? '' : 's'}`}
                </Text>
              </TouchableOpacity>
            )}
            {accountTxs.length === 0 && removedCount === 0 && (
              <Text className="font-inter text-body-sm text-on-surface-variant p-md">No transactions to manage.</Text>
            )}
          </View>
        </View>

        <View>
          <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-sm">Transactions ({accountTxs.length})</Text>
          <View className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
            {accountTxs.length === 0 ? (
              <View className="p-xl items-center">
                <Text className="font-inter text-body-md text-on-surface-variant">No transactions for this account</Text>
              </View>
            ) : (
              accountTxs.map((tx, i) => (
                <AccountTxRow
                  key={tx.id}
                  tx={tx}
                  currency={currency}
                  bankLabel={account?.nickname || bankName}
                  isLast={i === accountTxs.length - 1}
                  onPress={() => navigation.navigate('TransactionDetail', { transactionId: tx.id })}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function AccountTxRow({
  tx, currency, bankLabel, isLast, onPress,
}: { tx: TxRecord; currency: string; bankLabel: string; isLast: boolean; onPress: () => void }) {
  const debit = isDebit(tx.type);
  const color = txColor(tx.type);
  return (
    <TouchableOpacity
      className={`flex-row items-center gap-md px-md py-[14px] ${!isLast ? 'border-b border-outline-variant' : ''}`}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="w-[40px] h-[40px] rounded-lg items-center justify-center" style={{ backgroundColor: `${color}20` }}>
        <Text className="text-[16px] font-inter-bold" style={{ color }}>{debit ? '↓' : '↑'}</Text>
      </View>
      <View className="flex-1">
        <Text className="font-inter-medium text-body-sm text-on-surface" numberOfLines={1}>{tx.merchant || bankLabel}</Text>
        <Text className="font-mono text-label-sm tracking-[0px] text-on-surface-variant mt-[2px]">{formatDate(tx.timestamp)}</Text>
      </View>
      <Text className="font-mono text-[15px] leading-[20px]" style={{ color }}>{debit ? '-' : '+'}{formatAmount(tx.amount, currency)}</Text>
    </TouchableOpacity>
  );
}
