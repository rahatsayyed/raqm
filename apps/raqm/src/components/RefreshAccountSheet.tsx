import React, { useEffect, useState } from 'react';
import { Modal, Pressable, View, Text, TextInput, Keyboard, Linking, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../theme';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';
import { PencilIcon, MessageSquareIcon, PhoneIcon } from './TabIcon';

interface Props {
  visible: boolean;
  onClose: () => void;
  bankName: string;
  /** Account alias to show instead of bankName, if one is set. */
  displayName?: string;
  last4: string | null;
  onManualUpdate: (balance: number) => Promise<unknown> | void;
  initialMode?: 'options' | 'manual';
  /** Pre-fills the "New balance" field — e.g. the bank-reported balance from a mismatch,
   *  so the user doesn't have to work out the correct figure themselves. */
  initialAmount?: number;
}

/**
 * Bottom sheet opened from an account card's refresh icon — offers a manual balance
 * update, texting the bank for a balance SMS, or a missed-call balance check. Not
 * routed through TransactionDetailScreen's BottomSheet (that component isn't
 * exported) — replicates its keyboard-lift technique per CLAUDE.md, since the
 * "Update manually" step needs a text input.
 */
export function RefreshAccountSheet({ visible, onClose, bankName, displayName, last4, onManualUpdate, initialMode = 'options', initialAmount }: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [mode, setMode] = useState<'options' | 'manual'>(initialMode);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setAmount(initialAmount != null ? String(initialAmount) : '');
      Keyboard.dismiss();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const maxSheetHeight = keyboardHeight > 0 ? windowHeight - keyboardHeight - insets.top - Spacing.lg : windowHeight * 0.8;

  const handleSaveManual = async () => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed < 0 || saving) return;
    setSaving(true);
    try {
      await onManualUpdate(parsed);
    } finally {
      setSaving(false);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60 justify-end" onPress={onClose}>
        <Pressable
          className="bg-surface-container-low rounded-t-2xl border-t border-outline-variant"
          style={{ maxHeight: maxSheetHeight, marginBottom: keyboardHeight }}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="items-center py-sm">
            <View className="w-[40px] h-[4px] rounded-full bg-outline-variant" />
          </View>

          <KeyboardAwareScrollView
            enableOnAndroid
            extraScrollHeight={Spacing.lg}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: (keyboardHeight > 0 ? 0 : insets.bottom) + Spacing.sm }}
          >
            <View className="px-lg mb-md">
              <Text className="font-inter-semibold text-section-header text-on-surface-variant uppercase tracking-widest">
                Refresh Account
              </Text>
              <Text className="font-inter text-annotation text-on-surface-variant mt-[4px]">
                {displayName || bankName}
                {last4 ? ` ••${last4}` : ''}
              </Text>
            </View>

            {mode === 'options' ? (
              <View className="px-md pb-md gap-[4px]">
                <Pressable
                  className="flex-row items-center gap-md p-md rounded-xl active:bg-surface-container-high"
                  onPress={() => setMode('manual')}
                >
                  <View className="w-[40px] h-[40px] rounded-sm bg-surface-container items-center justify-center">
                    <PencilIcon color={Colors.onSurfaceVariant} size={16} />
                  </View>
                  <View className="flex-1 gap-[2px]">
                    <Text className="font-inter-medium text-body-md text-on-surface">Update manually</Text>
                    <Text className="font-inter text-annotation text-on-surface-variant" numberOfLines={2}>
                      Enter the account balance yourself
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  className="flex-row items-center gap-md p-md rounded-xl active:bg-surface-container-high"
                  onPress={() => Linking.openURL('sms:')}
                >
                  <View className="w-[40px] h-[40px] rounded-sm bg-surface-container items-center justify-center">
                    <MessageSquareIcon color={Colors.onSurfaceVariant} size={16} />
                  </View>
                  <View className="flex-1 gap-[2px]">
                    <Text className="font-inter-medium text-body-md text-on-surface">Send SMS</Text>
                    <Text className="font-inter text-annotation text-on-surface-variant" numberOfLines={2}>
                      Text your bank's balance-check number
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  className="flex-row items-center gap-md p-md rounded-xl active:bg-surface-container-high"
                  onPress={() => Linking.openURL('tel:')}
                >
                  <View className="w-[40px] h-[40px] rounded-sm bg-surface-container items-center justify-center">
                    <PhoneIcon color={Colors.onSurfaceVariant} size={16} />
                  </View>
                  <View className="flex-1 gap-[2px]">
                    <Text className="font-inter-medium text-body-md text-on-surface">Call to refresh</Text>
                    <Text className="font-inter text-annotation text-on-surface-variant" numberOfLines={2}>
                      Dial your bank's missed-call balance number
                    </Text>
                  </View>
                </Pressable>
              </View>
            ) : (
              <View className="px-lg pb-lg gap-sm">
                <Text className="font-mono text-label-sm text-on-surface-variant">New balance</Text>
                <TextInput
                  className="font-mono-medium text-body-md text-on-surface bg-surface-variant rounded-md px-sm py-[10px]"
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor={Colors.onSurfaceVariant}
                  keyboardType="numeric"
                  autoFocus
                />
                <View className="flex-row gap-sm mt-sm">
                  <Pressable className="flex-1 bg-surface-variant rounded-lg py-[10px] items-center" onPress={() => setMode('options')}>
                    <Text className="font-inter-medium text-body-md text-on-surface">Back</Text>
                  </Pressable>
                  <Pressable className="flex-1 bg-primary rounded-lg py-[10px] items-center" disabled={saving} onPress={handleSaveManual}>
                    <Text className="font-inter-medium text-body-md text-on-primary">{saving ? 'Saving…' : 'Save'}</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </KeyboardAwareScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
