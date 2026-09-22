import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Colors } from "../theme";
import { ArrowUpRightIcon, RefreshIcon } from "./TabIcon";
import { formatAmount } from "../utils/format";
import { MaskedValue } from "./MaskedValue";
import { RefreshAccountSheet } from "./RefreshAccountSheet";
import { cn } from "../utils/cn";

interface Props {
  bankName: string;
  /** Account alias to show instead of bankName, if one is set. */
  displayName?: string;
  last4: string | null;
  balance: number;
  currency?: string;
  updatedAt: number;
  monthSpend?: number;
  onPress?: () => void;
  onManualUpdate?: (balance: number) => Promise<unknown> | void;
  /** Smaller footprint for the ScanComplete onboarding strip (230x108 vs. the default 290x140). */
  compact?: boolean;
}

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "Updated just now";
  if (mins < 60) return `Updated ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}

/** Per-account balance card for the Briefing "Total Liquidity" strip — split bank-identity/balance panels. */
export function AccountLiquidityCard({
  bankName,
  displayName,
  last4,
  balance,
  currency = "₹",
  updatedAt,
  monthSpend,
  onPress,
  onManualUpdate,
  compact = false,
}: Props) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const label = displayName || bankName;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        className={cn(
          'flex-row rounded-inner border border-outline-variant relative overflow-hidden',
          compact ? 'w-[230px] min-h-[108px]' : 'w-[290px] min-h-[140px]',
        )}
      >
        <View
          className={cn(
            'w-[35%] bg-surface-container-low justify-between border-r border-outline-variant',
            compact ? 'p-[10px]' : 'p-3',
          )}
        >
          <View
            className={cn(
              'rounded-sm bg-surface-bright items-center justify-center',
              compact ? 'w-[28px] h-[28px]' : 'w-[40px] h-[40px]',
            )}
          >
            <Text className={cn('font-inter-bold text-primary', compact ? 'text-[12px]' : 'text-body-sm')}>
              {label.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text
              className={cn('font-inter-semibold text-on-surface', compact ? 'text-[10px]' : 'text-annotation')}
              numberOfLines={1}
            >
              {label}
            </Text>
            {last4 && (
              <Text className="font-mono text-[9px] text-on-surface-variant mt-[2px]">{`xx${last4}`}</Text>
            )}
          </View>
        </View>
        <View
          className={cn(
            'w-[65%] bg-surface-container-lowest justify-between',
            compact ? 'p-[10px]' : 'p-3',
          )}
        >
          <View className="flex flex-row gap-1 items-end justify-end">
            {monthSpend != null && (
              <Text className="font-mono text-sm text-on-surface-variant mt-[2px]">{formatAmount(monthSpend, currency)}</Text>
            )}
            <ArrowUpRightIcon color={Colors.onSurfaceVariant} size={18} />
          </View>

          <View>
            <View>
              <Text className="font-inter-semibold text-[9px] leading-[14px] tracking-[0.05em] text-on-surface-variant mb-[2px]">
                Available Balance
              </Text>
              <MaskedValue
                kind="bank_balance"
                value={balance}
                currency={currency}
                className={cn(
                  'font-mono-medium text-on-surface',
                  compact ? 'text-[15px] leading-[18px]' : 'text-[22px] leading-[26px]',
                )}
                numberOfLines={1}
              />
            </View>
            <View className="flex-row items-center justify-between">
              <Text
                className="font-inter text-[9px] text-on-surface-variant flex-1 mr-sm"
                numberOfLines={1}
              >
                {timeAgo(updatedAt)}
              </Text>
              {onManualUpdate && (
                <TouchableOpacity
                  hitSlop={8}
                  onPress={() => setSheetVisible(true)}
                  className="w-fit items-center justify-center"
                >
                  <RefreshIcon color={Colors.onSurfaceVariant} size={16} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <RefreshAccountSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        bankName={bankName}
        displayName={displayName}
        last4={last4}
        onManualUpdate={async (newBalance) => onManualUpdate?.(newBalance)}
      />
    </>
  );
}
