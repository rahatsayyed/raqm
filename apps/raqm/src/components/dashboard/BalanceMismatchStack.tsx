import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Colors } from '../../theme';
import type { BalanceMismatch } from '../../services/balanceIntegrity';

interface BalanceMismatchStackProps {
  mismatches: BalanceMismatch[];
  onDismiss: (mismatch: BalanceMismatch) => void;
  onReportSms: (mismatch: BalanceMismatch) => void;
  onUpdateBalance: (mismatch: BalanceMismatch) => void;
}

const SWIPE_THRESHOLD = 100;
const FLING_DISTANCE = 500;
const EXIT_DURATION = 180;
const MAX_STACK = 3;
const CARD_HEIGHT = 176;

function MismatchCard({
  mismatch,
  depth,
  onDismiss,
  onReportSms,
  onUpdateBalance,
}: {
  mismatch: BalanceMismatch;
  depth: number; // 0 = front (interactive), 1/2 = stacked behind
  onDismiss: (mismatch: BalanceMismatch) => void;
  onReportSms: (mismatch: BalanceMismatch) => void;
  onUpdateBalance: (mismatch: BalanceMismatch) => void;
}) {
  const isFront = depth === 0;
  const translateX = useSharedValue(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!exiting) return;
    const t = setTimeout(() => onDismiss(mismatch), EXIT_DURATION);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exiting]);

  const pan = Gesture.Pan()
    .enabled(isFront)
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        const dir = e.translationX > 0 ? 1 : -1;
        translateX.value = withTiming(dir * FLING_DISTANCE, { duration: EXIT_DURATION });
        runOnJS(setExiting)(true);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: isFront ? translateX.value : -depth * 10 },
      { scale: isFront ? 1 : 1 - depth * 0.04 },
    ],
    opacity: isFront ? 1 : 1 - depth * 0.28,
  }));

  const dismissLabelStyle = useAnimatedStyle(() => ({
    opacity: Math.min(Math.abs(translateX.value) / SWIPE_THRESHOLD, 1),
  }));

  const card = (
    <Animated.View
      style={[{ position: 'absolute', left: 0, right: 0, zIndex: MAX_STACK - depth }, cardStyle]}
      pointerEvents={isFront ? 'auto' : 'none'}
    >
      <View className="bg-bg-surface border border-secondary rounded-[12px] p-[24px]">
        {isFront && (
          <Animated.View
            style={dismissLabelStyle}
            className="absolute top-[16px] right-[24px] px-sm py-[2px] rounded-full bg-secondary/20"
          >
            <Text className="font-inter-semibold text-annotation text-secondary tracking-[1px]">DISMISS</Text>
          </Animated.View>
        )}
        <View className="flex-row items-center gap-[8px] mb-[16px]">
          <Text className="text-secondary text-body-standard">⚠</Text>
          <Text className="font-inter-semibold text-section-header text-secondary">NEEDS YOUR ATTENTION</Text>
        </View>
        <Text className="font-inter-medium text-insight-reading text-on-surface mb-[24px]" numberOfLines={3}>
          {mismatch.bankName}
          {mismatch.last4 ? ` ••${mismatch.last4}` : ''}'s balance doesn't match what we've tracked — we may have missed a transaction.
        </Text>
        <View className="flex-row gap-sm">
          <TouchableOpacity
            className="flex-1 bg-secondary rounded-[8px] py-[12px] items-center"
            activeOpacity={0.8}
            onPress={() => onReportSms(mismatch)}
          >
            <Text className="font-inter-semibold text-annotation text-on-secondary tracking-[1px]">REPORT SMS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 border border-secondary rounded-[8px] py-[12px] items-center"
            activeOpacity={0.8}
            onPress={() => onUpdateBalance(mismatch)}
          >
            <Text className="font-inter-semibold text-annotation text-secondary tracking-[1px]">UPDATE BALANCE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  return isFront ? <GestureDetector gesture={pan}>{card}</GestureDetector> : card;
}

/** Swipe-to-dismiss stack for balance-mismatch alerts — up to 3 shown, front card interactive. */
export function BalanceMismatchStack({ mismatches, onDismiss, onReportSms, onUpdateBalance }: BalanceMismatchStackProps) {
  if (mismatches.length === 0) return null;
  const visible = mismatches.slice(0, MAX_STACK);

  return (
    <View className="mx-[24px] mb-[32px]" style={{ height: CARD_HEIGHT }}>
      {visible.map((mismatch, depth) => (
        <MismatchCard
          key={mismatch.key}
          mismatch={mismatch}
          depth={depth}
          onDismiss={onDismiss}
          onReportSms={onReportSms}
          onUpdateBalance={onUpdateBalance}
        />
      ))}
    </View>
  );
}
