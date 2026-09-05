import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { BUILT_IN_NOTIFICATION_APPS } from '@rahatsayyed/bank-sms-parser';
import { MainStackScreenProps } from '../../navigation/types';
import { Colors } from '../../theme';
import { BackIcon, SearchIcon } from '../../components/TabIcon';
import { SmsReader, type InstalledApp } from '../../native/SmsReader';
import {
  getMonitoredNotificationPackages,
  setMonitoredNotificationPackages,
} from '../../db/database';

const BUILT_IN_PACKAGES = new Set(BUILT_IN_NOTIFICATION_APPS.map((a) => a.packageName));

function keyExtractor(app: InstalledApp): string {
  return app.packageName;
}

function renderSeparator() {
  return <View className="h-[1px] bg-outline-variant" />;
}

const AppRow = React.memo(function AppRow({
  packageName,
  appName,
  checked,
  supported,
  onToggle,
}: {
  packageName: string;
  appName: string;
  checked: boolean;
  supported: boolean;
  onToggle: (packageName: string) => void;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center justify-between py-md"
      activeOpacity={0.6}
      onPress={() => onToggle(packageName)}
    >
      <View className="flex-1 pr-sm">
        <Text className="font-inter text-body-standard text-on-surface" numberOfLines={1}>{appName}</Text>
        <Text className="font-inter text-annotation text-on-surface-variant mt-[2px]" numberOfLines={1}>
          {supported ? 'Built-in parser' : packageName}
        </Text>
      </View>
      <View
        className={`w-6 h-6 rounded-sm items-center justify-center border ${
          checked ? 'bg-primary border-primary' : 'border-outline-variant'
        }`}
      >
        {checked ? <Text className="text-on-primary text-[13px] font-inter-bold">✓</Text> : null}
      </View>
    </TouchableOpacity>
  );
});

export function NotificationAppsScreen({ navigation }: MainStackScreenProps<'NotificationApps'>) {
  const [apps, setApps] = useState<InstalledApp[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [installed, saved] = await Promise.all([
        SmsReader.getInstalledApps(),
        getMonitoredNotificationPackages(),
      ]);
      if (cancelled) return;

      // First visit (nothing saved yet): pre-check every built-in app that is installed,
      // per the spec. After that, respect exactly what the user last chose — including
      // an empty selection.
      const initial =
        saved.length > 0
          ? new Set(saved)
          : new Set(installed.map((a) => a.packageName).filter((p) => BUILT_IN_PACKAGES.has(p)));

      setApps(installed);
      setSelected(initial);
      if (saved.length === 0 && initial.size > 0) {
        await setMonitoredNotificationPackages(Array.from(initial));
        await SmsReader.setMonitoredNotificationPackages(Array.from(initial));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = useCallback((packageName: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(packageName)) next.delete(packageName);
      else next.add(packageName);
      const list = Array.from(next);
      // Persist immediately (both stores) — there is no Save button, and the native
      // SharedPreferences copy is what the listener service actually reads.
      setMonitoredNotificationPackages(list).catch(() => {});
      SmsReader.setMonitoredNotificationPackages(list).catch(() => {});
      return next;
    });
  }, []);

  // Selected apps float to the top so the user can see their choices without scrolling
  // a 300-app list; within each group the native side already sorted by display name.
  const filtered = useMemo(() => {
    const source = apps ?? [];
    const q = query.trim().toLowerCase();
    const matching = q
      ? source.filter(
          (a) => a.appName.toLowerCase().includes(q) || a.packageName.toLowerCase().includes(q),
        )
      : source;
    return [...matching].sort((a, b) => {
      const aSel = selected.has(a.packageName) ? 0 : 1;
      const bSel = selected.has(b.packageName) ? 0 : 1;
      return aSel - bSel;
    });
  }, [apps, query, selected]);

  const renderItem = useCallback(
    ({ item }: { item: InstalledApp }) => (
      <AppRow
        packageName={item.packageName}
        appName={item.appName}
        checked={selected.has(item.packageName)}
        supported={BUILT_IN_PACKAGES.has(item.packageName)}
        onToggle={handleToggle}
      />
    ),
    [selected, handleToggle],
  );

  return (
    <View className="flex-1 bg-background p-container-margin">
      <View className="flex-row items-center justify-between mt-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <BackIcon color={Colors.onSurface} size={22} />
        </TouchableOpacity>
        <Text className="font-inter-bold text-headline-sm text-on-surface flex-1 text-center mx-sm" numberOfLines={1}>
          Apps to read
        </Text>
        <View className="w-[22px]" />
      </View>

      <Text className="font-inter text-annotation text-on-surface-variant mt-xs">
        Raqm reads transaction notifications only from the apps you check here. Apps with a
        built-in parser are pre-selected; anything else you add gets queued for reporting
        until its format is supported.
      </Text>

      <View className="relative mt-md mb-sm">
        <View className="absolute left-sm top-0 bottom-0 justify-center z-[1]">
          <SearchIcon color={Colors.inkLabel} size={18} />
        </View>
        <TextInput
          className="bg-surface-container-lowest border border-border-subtle rounded-lg py-[10px] pl-[40px] pr-md font-inter text-body-standard text-on-surface"
          placeholder="Search apps…"
          placeholderTextColor={Colors.inkLabel}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {apps === null ? (
        <View className="pt-[60px] items-center">
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={keyExtractor}
          contentContainerClassName="pb-[32px]"
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={renderSeparator}
          ListEmptyComponent={
            <View className="pt-[60px] items-center">
              <Text className="font-inter text-body-md text-on-surface-variant text-center">
                {query.trim() ? `Nothing matches "${query.trim()}".` : 'No installed apps found.'}
              </Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </View>
  );
}
