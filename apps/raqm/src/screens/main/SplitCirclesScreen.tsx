import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ToastAndroid } from 'react-native';
import { Colors, Spacing } from '../../theme';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { MainStackScreenProps } from '../../navigation/types';
import { pickContact } from '../../utils/contacts';
import {
  getSplitCircles,
  addSplitCircle,
  renameSplitCircle,
  deleteSplitCircle,
  getSplitCircleMembers,
  addSplitCircleMember,
  deleteSplitCircleMember,
} from '../../db/database';
import type { SplitCircle, SplitCircleMember } from '../../db/database';

function CircleRow({
  circle,
  onDelete,
  onRenamed,
  deletingThis,
}: {
  circle: SplitCircle;
  onDelete: (id: number) => void;
  onRenamed: () => void;
  deletingThis: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [members, setMembers] = useState<SplitCircleMember[]>([]);
  const [adding, setAdding] = useState(false);
  const [manualName, setManualName] = useState('');
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(circle.name);
  const [savingRename, setSavingRename] = useState(false);
  const renameRef = useRef<TextInput>(null);

  const loadMembers = useCallback(() => {
    getSplitCircleMembers(circle.id).then(setMembers);
  }, [circle.id]);

  useEffect(() => {
    if (expanded) loadMembers();
  }, [expanded, loadMembers]);

  const removeMember = async (memberId: number) => {
    if (removingMemberId !== null) return;
    setRemovingMemberId(memberId);
    try {
      await deleteSplitCircleMember(memberId);
      loadMembers();
    } finally {
      setRemovingMemberId(null);
    }
  };

  const startRename = () => {
    setRenameValue(circle.name);
    setRenaming(true);
    setTimeout(() => renameRef.current?.focus(), 80);
  };

  const saveRename = async () => {
    const name = renameValue.trim();
    if (!name || savingRename) return;
    setSavingRename(true);
    try {
      await renameSplitCircle(circle.id, name);
      setRenaming(false);
      onRenamed();
    } finally {
      setSavingRename(false);
    }
  };


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
      {renaming ? (
        <View className="flex-row items-center">
          <TextInput
            ref={renameRef}
            className="flex-1 font-inter text-body-md text-on-surface bg-surface rounded-lg border border-outline-variant px-sm py-[6px]"
            placeholderTextColor={Colors.outline}
            value={renameValue}
            onChangeText={setRenameValue}
          />
          <TouchableOpacity className="ml-sm" onPress={saveRename} disabled={savingRename}>
            <Text className="font-inter-medium text-body-sm text-primary">Save</Text>
          </TouchableOpacity>
          <TouchableOpacity className="ml-sm" onPress={() => setRenaming(false)} disabled={savingRename}>
            <Text className="font-inter text-body-sm text-on-surface-variant">Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-row items-center justify-between">
          <TouchableOpacity className="flex-1" onPress={() => setExpanded((v) => !v)}>
            <Text className="font-inter-medium text-body-md text-on-surface">{circle.name}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={startRename}>
            <Text className="font-inter text-body-sm text-primary">Rename</Text>
          </TouchableOpacity>
          <TouchableOpacity className="ml-md" onPress={() => onDelete(circle.id)} disabled={deletingThis}>
            <Text className="font-inter text-body-sm text-error">Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      {expanded && (
        <View className="mt-sm">
          {members.map((m) => (
            <View key={m.id} className="flex-row items-center justify-between py-[6px]">
              <Text className="font-inter text-body-sm text-on-surface-variant">
                {m.name}{m.phoneNumber ? ` · ${m.phoneNumber}` : ''}
              </Text>
              <TouchableOpacity onPress={() => removeMember(m.id)} disabled={removingMemberId !== null}>
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

  const [deletingCircleId, setDeletingCircleId] = useState<number | null>(null);

  const removeCircle = async (id: number) => {
    if (deletingCircleId !== null) return;
    setDeletingCircleId(id);
    try {
      await deleteSplitCircle(id);
      load();
      ToastAndroid.show('Circle deleted', ToastAndroid.SHORT);
    } finally {
      setDeletingCircleId(null);
    }
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

      <KeyboardAwareScrollView
        contentContainerClassName="px-container-margin pb-[48px]"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={Spacing.lg}
        keyboardShouldPersistTaps="handled"
      >
        {circles.map((c) => (
          <CircleRow
            key={c.id}
            circle={c}
            onDelete={removeCircle}
            onRenamed={load}
            deletingThis={deletingCircleId === c.id}
          />
        ))}

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
      </KeyboardAwareScrollView>
    </View>
  );
}
