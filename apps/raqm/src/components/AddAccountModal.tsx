import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, Switch } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../theme';
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
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Add account</Text>

          <Text style={styles.label}>Bank name</Text>
          <TextInput
            style={styles.input} value={bankName} onChangeText={setBankName}
            placeholder="e.g. HDFC Bank" placeholderTextColor={Colors.outline}
          />

          <Text style={styles.label}>Last 4 digits (optional)</Text>
          <TextInput
            style={styles.input} value={last4} onChangeText={setLast4}
            placeholder="e.g. 4821" keyboardType="numeric" maxLength={4}
            placeholderTextColor={Colors.outline}
          />

          <Text style={styles.label}>Nickname (optional)</Text>
          <TextInput
            style={styles.input} value={nickname} onChangeText={setNickname}
            placeholder="e.g. Salary account" placeholderTextColor={Colors.outline}
          />

          <View style={styles.switchRow}>
            <Text style={styles.label}>This is a credit/debit card</Text>
            <Switch value={isCard} onValueChange={setIsCard} trackColor={{ true: Colors.primary }} />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { reset(); onClose(); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, !bankName.trim() && styles.addBtnDisabled]}
              onPress={handleAdd}
              disabled={saving || !bankName.trim()}
            >
              <Text style={styles.addText}>{saving ? 'Adding…' : 'Add account'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.bgSurfaceRaised, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl,
    padding: Spacing.lg, gap: Spacing.sm,
  },
  title: { ...Typography.headlineSm, color: Colors.onSurface, marginBottom: Spacing.sm },
  label: { ...Typography.labelSm, color: Colors.onSurfaceVariant, marginTop: Spacing.sm },
  input: {
    ...Typography.bodyMd, color: Colors.onSurface,
    backgroundColor: Colors.surfaceVariant, borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: 10,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: Radius.lg, backgroundColor: Colors.surfaceVariant },
  cancelText: { ...Typography.bodyMd, color: Colors.onSurface },
  addBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: Radius.lg, backgroundColor: Colors.primary },
  addBtnDisabled: { opacity: 0.5 },
  addText: { ...Typography.bodyMd, color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },
});
