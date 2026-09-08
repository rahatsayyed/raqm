import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import type { NavigationProp } from '@react-navigation/native';
import { TopHeader } from '../../components/TopHeader';
import { MainTabScreenProps, MainStackParamList } from '../../navigation/types';
import { getSplits, getSplitParticipants } from '../../db/database';
import type { Split, SplitParticipant } from '../../db/database';
import { formatAmount } from '../../utils/format';

type Row = { split: Split; participants: SplitParticipant[] };

export function SplitScreen({ navigation }: MainTabScreenProps<'Split'>) {
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(() => {
    getSplits().then(async (splits) => {
      const withParticipants = await Promise.all(
        // Sequential-per-split, not Promise.all-across-splits: mirrors the project's
        // general "avoid unbounded parallel SQLite reads" caution — split counts are
        // small (dozens, not thousands), so this stays cheap either way, but this
        // keeps the pattern consistent with insertParsedTxs' documented invariant.
        splits.map(async (split) => ({ split, participants: await getSplitParticipants(split.id) })),
      );
      setRows(withParticipants);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation, load]);

  const attentionCount = rows.reduce(
    (n, r) => n + r.participants.filter((p) => p.status === 'attention').length,
    0,
  );

  return (
    <View className="flex-1 bg-background">
      <TopHeader />

      <View className="flex-row items-center justify-between px-container-margin py-sm">
        <TouchableOpacity
          onPress={() => navigation.getParent<NavigationProp<MainStackParamList>>()?.navigate('SplitCircles')}
        >
          <Text className="font-inter text-body-sm text-primary">Circles</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="px-md py-[8px] bg-primary rounded-xl"
          onPress={() => navigation.getParent<NavigationProp<MainStackParamList>>()?.navigate('SplitCreate', undefined)}
        >
          <Text className="font-inter-medium text-body-sm text-on-primary">New Split</Text>
        </TouchableOpacity>
      </View>

      {attentionCount > 0 && (
        <View className="mx-container-margin mb-sm px-md py-[10px] bg-error/10 rounded-xl border border-error/30">
          <Text className="font-inter-medium text-body-sm text-error">
            {attentionCount} payment{attentionCount > 1 ? 's need' : ' needs'} your review
          </Text>
        </View>
      )}

      <FlatList
        contentContainerClassName="px-container-margin pb-[48px]"
        data={rows}
        keyExtractor={(r) => String(r.split.id)}
        renderItem={({ item }) => {
          const settledCount = item.participants.filter((p) => p.status === 'settled').length;
          return (
            <TouchableOpacity
              className="bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-md mb-sm"
              onPress={() =>
                navigation
                  .getParent<NavigationProp<MainStackParamList>>()
                  ?.navigate('SplitDetail', { splitId: item.split.id })
              }
            >
              <Text className="font-inter-medium text-body-md text-on-surface">{item.split.title}</Text>
              <View className="flex-row items-center justify-between mt-[4px]">
                <Text className="font-inter text-body-sm text-on-surface-variant">
                  {settledCount} of {item.participants.length} paid
                </Text>
                <Text className="font-mono text-body-sm text-on-surface">{formatAmount(item.split.totalAmount)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text className="font-inter text-body-sm text-on-surface-variant text-center mt-xl">
            No splits yet — tap "New Split" to add one.
          </Text>
        }
      />
    </View>
  );
}
