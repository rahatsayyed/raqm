import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MainStackScreenProps } from '../../navigation/types';
import { getAccounts, type Account } from '../../db/database';
import { AddAccountModal } from '../../components/AddAccountModal';
import { Colors } from '../../theme';
import { AddIcon, ChevronRightIcon } from '../../components/TabIcon';

function keyExtractor(account: Account): string {
  return String(account.id);
}

function renderSeparator() {
  return <View className="h-[1px] bg-outline-variant" />;
}

export function ManageAccountsScreen({ navigation }: MainStackScreenProps<'ManageAccounts'>) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [addVisible, setAddVisible] = useState(false);

  const load = useCallback(async () => {
    setAccounts(await getAccounts());
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const renderItem = useCallback(
    ({ item }: { item: Account }) => (
      <TouchableOpacity
        className="flex-row items-center justify-between py-md"
        activeOpacity={0.6}
        onPress={() => navigation.navigate('AccountDetail', { bankName: item.bankName, last4: item.last4 ?? undefined })}
      >
        <View className="flex-1">
          <Text className="font-inter-medium text-body-standard text-on-surface" numberOfLines={1}>
            {item.nickname || item.bankName}
          </Text>
          <Text className="font-inter text-annotation text-on-surface-variant mt-[2px]">
            {item.bankName}{item.last4 ? ` · xx${item.last4}` : ''}{item.isCard ? ' · Card' : ''}
          </Text>
        </View>
        <ChevronRightIcon color={Colors.inkLabel} size={18} />
      </TouchableOpacity>
    ),
    [navigation],
  );

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
      <Text className="font-inter-bold text-headline-sm text-on-surface mt-md mb-md">Manage accounts</Text>

      <FlatList
        data={accounts}
        keyExtractor={keyExtractor}
        contentContainerClassName="pb-[32px]"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={renderSeparator}
        ListEmptyComponent={
          loaded ? (
            <View className="pt-[60px] items-center">
              <Text className="font-inter text-body-md text-on-surface-variant">
                No accounts yet — they're auto-detected from SMS, or add one manually.
              </Text>
            </View>
          ) : null
        }
        renderItem={renderItem}
      />

      <AddAccountModal visible={addVisible} onClose={() => setAddVisible(false)} onAdded={load} />
    </View>
  );
}
