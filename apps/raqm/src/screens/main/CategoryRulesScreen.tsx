import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MainStackScreenProps } from '../../navigation/types';
import { getCategoryRules, deleteCategoryRule, type CategoryRule } from '../../db/database';
import { Colors } from '../../theme';
import { TrashIcon } from '../../components/TabIcon';

function keyExtractor(rule: CategoryRule): string {
  return String(rule.id);
}

function renderSeparator() {
  return <View className="h-[1px] bg-outline-variant" />;
}

export function CategoryRulesScreen({ navigation }: MainStackScreenProps<'CategoryRules'>) {
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setRules(await getCategoryRules());
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleDelete = useCallback(
    (rule: CategoryRule) => {
      Alert.alert(
        'Remove category rule',
        `"${rule.merchantPattern}" will no longer be auto-categorized as ${rule.categoryName}. This doesn't change past transactions.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await deleteCategoryRule(rule.id);
              await load();
            },
          },
        ],
      );
    },
    [load],
  );

  const renderItem = useCallback(
    ({ item }: { item: CategoryRule }) => (
      <View className="flex-row items-center justify-between py-md gap-sm">
        <View className="flex-1">
          <Text className="font-inter-medium text-body-standard text-on-surface" numberOfLines={1}>
            {item.merchantPattern}
          </Text>
          <Text className="font-inter text-annotation text-on-surface-variant mt-[2px]" numberOfLines={1}>
            → {item.categoryName}{item.subcategoryName ? ` / ${item.subcategoryName}` : ''}
          </Text>
        </View>
        <TouchableOpacity hitSlop={8} onPress={() => handleDelete(item)}>
          <TrashIcon color={Colors.errorMuted} size={18} />
        </TouchableOpacity>
      </View>
    ),
    [handleDelete],
  );

  return (
    <View className="flex-1 bg-background p-container-margin">
      <TouchableOpacity onPress={() => navigation.goBack()} className="mt-sm">
        <Text className="font-inter text-body-md text-primary">← Back</Text>
      </TouchableOpacity>
      <Text className="font-inter-bold text-headline-sm text-on-surface mt-md">Category rules</Text>
      <Text className="font-inter text-supporting-text text-on-surface-variant mt-sm mb-md">
        Whenever you edit a transaction's category, the merchant is remembered here and applied
        automatically to future SMS from the same sender.
      </Text>

      <FlatList
        data={rules}
        keyExtractor={keyExtractor}
        contentContainerClassName="pb-[32px]"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={renderSeparator}
        ListEmptyComponent={
          loaded ? (
            <View className="pt-[60px] items-center">
              <Text className="font-inter text-body-md text-on-surface-variant">
                No rules yet — editing a transaction's category creates one automatically.
              </Text>
            </View>
          ) : null
        }
        renderItem={renderItem}
      />
    </View>
  );
}
