import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ToastAndroid } from 'react-native';
import { Colors } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import { pickContact } from '../../utils/contacts';
import {
  getSplitCircles,
  addSplitCircle,
  deleteSplitCircle,
  getSplitCircleMembers,
  addSplitCircleMember,
  deleteSplitCircleMember,
} from '../../db/database';
import type { SplitCircle, SplitCircleMember } from '../../db/database';

function CircleRow({
  circle,
  onDelete,
}: {
  circle: SplitCircle;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [members, setMembers] = useState<SplitCircleMember[]>([]);
  const [adding, setAdding] = useState(false);
  const [manualName, setManualName] = useState('');

  const loadMembers = useCallback(() => {
    getSplitCircleMembers(circle.id).then(setMembers);
  }, [circle.id]);

  useEffect(() => {
    if (expanded) loadMembers();
  }, [expanded, loadMembers]);

  const addFromContacts = async () => {
    if (adding) return;
    setAdding(true);
    try {
      const picked = await pickContact();
      if (!picked) return;
      await addSplitCircleMember(circle.id, picked.name, picked.phoneNumber);
      loadMembers();
    } finally {
      setAdding(false);
    }
  };

  const addManual = async () => {
    const name = manualName.trim();
    if (!name || adding) return;
    setAdding(true);
    try {
      await addSplitCircleMember(circle.id, name, null);
      setManualName('');
      loadMembers();
    } finally {
      setAdding(false);
    }
  };

  return (
    <View className="bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-md mb-sm">
      <TouchableOpacity
        className="flex-row items-center justify-between"
        onPress={() => setExpanded((v) => !v)}
      >
        <Text className="font-inter-medium text-body-md text-on-surface">{circle.name}</Text>
        <TouchableOpacity onPress={() => onDelete(circle.id)}>
          <Text className="font-inter text-body-sm text-error">Delete</Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {expanded && (
        <View className="mt-sm">
          {members.map((m) => (
            <View key={m.id} className="flex-row items-center justify-between py-[6px]">
              <Text className="font-inter text-body-sm text-on-surface-variant">
                {m.name}{m.phoneNumber ? ` · ${m.phoneNumber}` : ''}
              </Text>
              <TouchableOpacity onPress={() => deleteSplitCircleMember(m.id).then(loadMembers)}>
                <Text className="font-inter text-body-sm text-error">Remove</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity className="mt-sm py-[8px]" onPress={addFromContacts} disabled={adding}>
            <Text className="font-inter text-body-sm text-primary">+ Add from contacts</Text>
          </TouchableOpacity>

          <View className="flex-row items-center mt-sm">
            <TextInput
              className="flex-1 font-inter text-body-sm text-on-surface bg-surface rounded-lg border border-outline-variant px-sm py-[8px]"
              placeholder="Or type a name…"
              placeholderTextColor={Colors.outline}
              value={manualName}
              onChangeText={setManualName}
            />
            <TouchableOpacity className="ml-sm px-md py-[8px] bg-primary rounded-lg" onPress={addManual} disabled={adding}>
              <Text className="font-inter-medium text-body-sm text-on-primary">Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export function SplitCirclesScreen({ navigation }: MainStackScreenProps<'SplitCircles'>) {
  const [circles, setCircles] = useState<SplitCircle[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    getSplitCircles().then(setCircles);
  }, []);

  useEffect(load, [load]);

  const createCircle = async () => {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      await addSplitCircle(name);
      setNewName('');
      load();
    } finally {
      setCreating(false);
    }
  };

  const removeCircle = async (id: number) => {
    await deleteSplitCircle(id);
    load();
    ToastAndroid.show('Circle deleted', ToastAndroid.SHORT);
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-container-margin pt-sm pb-md">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="font-inter text-body-md text-primary w-[70px]">‹ Back</Text>
        </TouchableOpacity>
        <Text className="font-inter-bold text-title-lg text-on-surface">Circles</Text>
        <View className="w-[60px]" />
      </View>

      <FlatList
        contentContainerClassName="px-container-margin pb-[48px]"
        data={circles}
        keyExtractor={(c) => String(c.id)}
        renderItem={({ item }) => <CircleRow circle={item} onDelete={removeCircle} />}
        ListFooterComponent={
          <View className="flex-row items-center mt-md">
            <TextInput
              className="flex-1 font-inter text-body-md text-on-surface bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-[12px]"
              placeholder="New circle name"
              placeholderTextColor={Colors.outline}
              value={newName}
              onChangeText={setNewName}
            />
            <TouchableOpacity className="ml-sm px-md py-[12px] bg-primary rounded-xl" onPress={createCircle} disabled={creating}>
              <Text className="font-inter-medium text-body-md text-on-primary">Create</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}
