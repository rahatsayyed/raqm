import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, Pressable, Keyboard, useWindowDimensions,
  type KeyboardTypeOptions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../theme';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';

// RN's Modal renders in its own Dialog window, edge-to-edge on Expo SDK 56 — Android's
// adjustResize does NOT shrink it when the keyboard opens, so scroll-into-view math alone
// can't clear the keyboard. Track keyboard height ourselves and lift the sheet above it,
// shrinking its max height so it still fits. Mirrors TransactionDetailScreen's BottomSheet,
// which isn't exported — see CLAUDE.md keyboard-avoidance section.
export function EditFieldSheet({
  visible,
  onClose,
  title,
  placeholder,
  initialValue,
  keyboardType,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  placeholder?: string;
  initialValue: string;
  keyboardType?: KeyboardTypeOptions;
  onConfirm: (value: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [value, setValue] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [visible, initialValue]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const maxSheetHeight = keyboardHeight > 0
    ? windowHeight - keyboardHeight - insets.top - Spacing.lg
    : windowHeight * 0.8;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-[#0e151299] justify-end" onPress={onClose}>
        <Pressable
          className="bg-surface-container-low rounded-t-2xl border-t border-border-subtle"
          style={{ maxHeight: maxSheetHeight, marginBottom: keyboardHeight }}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="items-center py-3">
            <View className="w-12 h-1.5 rounded-full bg-surface-variant" />
          </View>
          <KeyboardAwareScrollView
            enableOnAndroid
            extraScrollHeight={Spacing.lg}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: (keyboardHeight > 0 ? 0 : insets.bottom) + Spacing.sm }}
          >
            <View className="px-lg pb-lg">
              <Text className="font-inter-medium text-insight-reading text-ink-headline mb-md">{title}</Text>
              <TextInput
                ref={inputRef}
                className="font-inter text-body-standard text-on-surface bg-bg-surface rounded-lg border border-border-subtle px-md py-3 mb-md"
                placeholder={placeholder}
                placeholderTextColor={Colors.inkLabel}
                keyboardType={keyboardType}
                value={value}
                onChangeText={setValue}
              />
              <TouchableOpacity
                className="bg-primary rounded-lg py-[10px] items-center"
                onPress={() => onConfirm(value.trim())}
              >
                <Text className="font-inter-medium text-body-standard text-on-primary">Save</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAwareScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
