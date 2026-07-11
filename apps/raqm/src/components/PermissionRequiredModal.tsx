import React from 'react';
import { Modal, View, Text, TouchableOpacity, BackHandler, Linking } from 'react-native';

interface Props {
  visible: boolean;
  permissionName: string;
  reason: string;
  isPermanentlyDenied: boolean;
  onGrantPress: () => void;
  onDismiss: () => void;
}

export function PermissionRequiredModal({
  visible,
  permissionName,
  reason,
  isPermanentlyDenied,
  onGrantPress,
  onDismiss,
}: Props) {
  const handleExit = () => {
    onDismiss();
    BackHandler.exitApp();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <View className="flex-1 bg-black/[0.55] justify-end">
        <View className="bg-surface-container-lowest rounded-t-[28px] p-container-margin pb-xxl items-center gap-sm">
          <View className="mb-sm">
            <View className="w-16 h-16 rounded-full bg-error-container items-center justify-center">
              <Text className="text-[30px]">⚠️</Text>
            </View>
          </View>

          <Text className="font-inter-semibold text-on-surface text-[20px] leading-[26px]">Permission Required</Text>
          <Text className="font-inter-medium text-error text-[14px] leading-[20px] tracking-[0.5px] uppercase">
            {permissionName}
          </Text>
          <Text className="font-inter text-body-md text-on-surface-variant text-center leading-[22px] mt-xs">
            {reason}
          </Text>

          {isPermanentlyDenied && (
            <View className="bg-error-container rounded-lg p-md mt-xs w-full">
              <Text className="font-inter text-body-sm text-on-error-container text-center leading-[18px]">
                You previously denied this permanently. Open Settings to grant it manually.
              </Text>
            </View>
          )}

          <TouchableOpacity
            className="w-full h-14 rounded-xl bg-primary items-center justify-center mt-md"
            onPress={isPermanentlyDenied ? () => Linking.openSettings() : onGrantPress}
            activeOpacity={0.85}
          >
            <Text className="font-inter-semibold text-on-primary text-[16px] leading-[20px] tracking-[0px]">
              {isPermanentlyDenied ? 'Open Settings' : 'Grant Permission'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="w-full h-12 items-center justify-center" onPress={handleExit} activeOpacity={0.7}>
            <Text className="font-inter text-body-md text-on-surface-variant">Exit App</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
