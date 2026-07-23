import React, { useState } from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onScan: (from: number, to: number) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function fmt(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function RescanModal({ visible, onClose, onScan }: Props) {
  const [fromDate, setFromDate] = useState(() => new Date(Date.now() - 30 * DAY_MS));
  const [toDate, setToDate] = useState(() => new Date());
  const [pickingField, setPickingField] = useState<'from' | 'to' | null>(null);

  const canScan = fromDate < toDate;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60 justify-end" onPress={onClose}>
        <Pressable className="bg-surface-container-low rounded-t-2xl border-t border-outline-variant p-lg gap-sm" onPress={(e) => e.stopPropagation()}>
          <Text className="font-inter-bold text-headline-sm text-on-surface mb-xs">Re-scan SMS</Text>
          <Text className="font-inter text-supporting-text text-on-surface-variant mb-md">
            Fills in transactions missing from the picked range. Categories, notes, edits, and
            deleted transactions are untouched.
          </Text>

          <View className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            <TouchableOpacity className="flex-row items-center justify-between px-md py-md" onPress={() => setPickingField('from')}>
              <Text className="font-inter text-body-standard text-on-surface-variant">From</Text>
              <Text className="font-inter-medium text-body-standard text-primary">{fmt(fromDate.getTime())}</Text>
            </TouchableOpacity>
            <View className="h-[1px] bg-outline-variant mx-md" />
            <TouchableOpacity className="flex-row items-center justify-between px-md py-md" onPress={() => setPickingField('to')}>
              <Text className="font-inter text-body-standard text-on-surface-variant">To</Text>
              <Text className="font-inter-medium text-body-standard text-primary">{fmt(toDate.getTime())}</Text>
            </TouchableOpacity>
          </View>
          {!canScan && (
            <Text className="font-inter text-annotation text-error-muted">Start date must be before end date.</Text>
          )}

          <View className="flex-row gap-sm mt-md">
            <TouchableOpacity className="flex-1 items-center py-3 rounded-lg bg-surface-container" onPress={onClose}>
              <Text className="font-inter text-body-standard text-on-surface">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 items-center py-3 rounded-lg bg-primary ${!canScan ? 'opacity-50' : ''}`}
              disabled={!canScan}
              onPress={() => onScan(fromDate.getTime(), toDate.getTime())}
            >
              <Text className="font-inter-medium text-body-standard text-on-primary">Scan</Text>
            </TouchableOpacity>
          </View>

          {pickingField !== null && (
            <DateTimePicker
              value={pickingField === 'from' ? fromDate : toDate}
              mode="date"
              display="default"
              maximumDate={pickingField === 'from' ? toDate : new Date()}
              minimumDate={pickingField === 'to' ? fromDate : undefined}
              onChange={(_event, selected) => {
                if (selected) {
                  if (pickingField === 'from') setFromDate(selected);
                  else setToDate(selected);
                }
                setPickingField(null);
              }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
