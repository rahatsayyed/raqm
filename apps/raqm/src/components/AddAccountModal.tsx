import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, Switch } from 'react-native';
import { Colors } from '../theme';
import { addAccount } from '../db/database';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export function AddAccountModal({ visible, onClose, onAdded }: Props) {
  const [bankName, setBankName] = useState('');
  const [last4, setLast4] = useState('');
  const [isCard, setIsCard] = useState(false);
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setBankName(''); setLast4(''); setIsCard(false); setNickname('');
  };

  const handleAdd = async () => {
    if (!bankName.trim()) return;
    setSaving(true);
    try {
      await addAccount({
        bankName: bankName.trim(),
        last4: last4.trim() || null,
        isCard,
        nickname: nickname.trim() || null,
      });
      reset();
      onAdded();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-bg-surface-raised rounded-t-2xl p-lg gap-sm">
          <Text className="font-inter-bold text-headline-sm text-on-surface mb-sm">Add account</Text>

          <Text className="font-mono text-label-sm text-on-surface-variant mt-sm">Bank name</Text>
          <TextInput
            className="font-inter text-body-md text-on-surface bg-surface-variant rounded-md px-sm py-[10px]"
            value={bankName} onChangeText={setBankName}
            placeholder="e.g. HDFC Bank" placeholderTextColor={Colors.outline}
          />

          <Text className="font-mono text-label-sm text-on-surface-variant mt-sm">Last 4 digits (optional)</Text>
          <TextInput
            className="font-inter text-body-md text-on-surface bg-surface-variant rounded-md px-sm py-[10px]"
            value={last4} onChangeText={setLast4}
            placeholder="e.g. 4821" keyboardType="numeric" maxLength={4}
            placeholderTextColor={Colors.outline}
          />

          <Text className="font-mono text-label-sm text-on-surface-variant mt-sm">Nickname (optional)</Text>
          <TextInput
            className="font-inter text-body-md text-on-surface bg-surface-variant rounded-md px-sm py-[10px]"
            value={nickname} onChangeText={setNickname}
            placeholder="e.g. Salary account" placeholderTextColor={Colors.outline}
          />

          <View className="flex-row items-center justify-between mt-md">
            <Text className="font-mono text-label-sm text-on-surface-variant mt-sm">This is a credit/debit card</Text>
            <Switch value={isCard} onValueChange={setIsCard} trackColor={{ true: Colors.primary }} />
          </View>

          <View className="flex-row gap-sm mt-lg">
            <TouchableOpacity className="flex-1 items-center py-3 rounded-lg bg-surface-variant" onPress={() => { reset(); onClose(); }}>
              <Text className="font-inter text-body-md text-on-surface">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 items-center py-3 rounded-lg bg-primary ${!bankName.trim() ? 'opacity-50' : ''}`}
              onPress={handleAdd}
              disabled={saving || !bankName.trim()}
            >
              <Text className="font-inter-medium text-body-md text-on-primary">{saving ? 'Adding…' : 'Add account'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
