import React, { useMemo, useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../Icon';
import { RqButton } from './RqButton';
import { cn } from '../../utils/cn';
import { useOnbColors, type OnbScheme } from '../../theme/onboardingColors';

type CalendarRangeSheetProps = {
  visible: boolean;
  scheme: OnbScheme;
  initialFrom: Date;
  initialTo: Date;
  minDate?: Date | null;
  maxDate?: Date;
  onClose: () => void;
  onApply: (from: Date, to: Date) => void;
};

type PickerView = 'days' | 'months' | 'years';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LABELS = Array.from({ length: 12 }, (_, m) => new Date(2000, m, 1).toLocaleDateString('en-IN', { month: 'short' }));
const SCREEN_HEIGHT = Dimensions.get('window').height;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmtShort(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function fmtShortYear(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Fixed 6-week grid so card height never jumps between months.
function buildMonthGrid(monthStart: Date): Date[] {
  const firstWeekday = monthStart.getDay();
  const gridStart = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 - firstWeekday);
  return Array.from(
    { length: 42 },
    (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i),
  );
}

function chunkIntoWeeks(days: Date[]): Date[][] {
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

// Day/month/year drill-down range picker, bounded to [minDate, maxDate].
export function CalendarRangeSheet({
  visible,
  scheme,
  initialFrom,
  initialTo,
  minDate,
  maxDate,
  onClose,
  onApply,
}: CalendarRangeSheetProps) {
  const { colors: c } = useOnbColors();
  const insets = useSafeAreaInsets();
  const isDark = scheme === 'dark';

  const today = startOfDay(new Date());
  const min = minDate ? startOfDay(minDate) : null;
  const max = maxDate ? startOfDay(maxDate) : today;
  const minMonth = min ? startOfMonth(min) : null;
  const maxMonth = startOfMonth(max);
  const minYear = min ? min.getFullYear() : maxMonth.getFullYear();
  const maxYear = maxMonth.getFullYear();

  const [pickerView, setPickerView] = useState<PickerView>('days');
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(initialTo));
  const [pickerYear, setPickerYear] = useState(() => initialTo.getFullYear());
  const [rangeStart, setRangeStart] = useState<Date>(startOfDay(initialFrom));
  const [rangeEnd, setRangeEnd] = useState<Date | null>(startOfDay(initialTo));

  const weeks = useMemo(() => chunkIntoWeeks(buildMonthGrid(viewMonth)), [viewMonth]);

  const canGoPrevMonth = !minMonth || startOfMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1)) >= minMonth;
  const canGoNextMonth = startOfMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1)) <= maxMonth;

  const handleClose = () => {
    setPickerView('days');
    onClose();
  };

  const handleDayPress = (day: Date) => {
    if ((min && day < min) || day > max) return;
    if (!rangeEnd) {
      if (day < rangeStart) {
        setRangeEnd(rangeStart);
        setRangeStart(day);
      } else {
        setRangeEnd(day);
      }
    } else {
      setRangeStart(day);
      setRangeEnd(null);
    }
  };

  const openMonthPicker = () => {
    setPickerYear(viewMonth.getFullYear());
    setPickerView('months');
  };

  const pickMonth = (monthIndex: number) => {
    setViewMonth(new Date(pickerYear, monthIndex, 1));
    setPickerView('days');
  };

  const pickYear = (year: number) => {
    setPickerYear(year);
    setPickerView('months');
  };

  const dayCount = rangeEnd ? Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000) + 1 : 1;
  const inRangeTint = c.accentPrimary + '29'; // ~16% alpha, matches mockup's rgba(...,0.16)

  return (
    // "slide" matches the app's shared BottomSheet (TransactionDetailScreen.tsx).
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 justify-end bg-black/60">
        <Pressable className="absolute inset-0" onPress={handleClose} />
        <View
          style={{ paddingBottom: insets.bottom + 20, maxHeight: SCREEN_HEIGHT * 0.86 }}
          className="bg-onb-bg-base dark:bg-onb-bg-base-dark rounded-t-[20px] px-lg pt-[14px] border-t border-onb-border-subtle dark:border-onb-border-subtle-dark"
        >
          <View className="w-9 h-1 rounded-full bg-onb-border-subtle dark:bg-onb-border-subtle-dark self-center mb-md" />
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="font-instrument-semibold text-[17px] text-onb-ink-headline dark:text-onb-ink-headline-dark">
              Pick a custom range
            </Text>
            <Pressable onPress={handleClose} hitSlop={8} className="p-1.5" accessibilityLabel="Close">
              <Icon name="close" size={18} color={c.inkBody} />
            </Pressable>
          </View>
          <Text className="font-instrument text-[14px] text-onb-ink-body dark:text-onb-ink-body-dark mb-[14px]">
            Choose a start and end date to scan.
          </Text>

          <View className="bg-onb-glass-bg dark:bg-onb-glass-bg-dark border border-onb-border-subtle dark:border-onb-border-subtle-dark rounded-inner p-[14px]">
            {pickerView === 'days' && (
              <>
                <View className="flex-row items-center justify-between mb-3">
                  <Pressable
                    disabled={!canGoPrevMonth}
                    onPress={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                    hitSlop={8}
                    className="p-1.5"
                    style={{ opacity: canGoPrevMonth ? 1 : 0.3 }}
                    accessibilityLabel="Previous month"
                  >
                    <Icon name="chevron-left" size={16} color={c.inkBody} />
                  </Pressable>
                  <Pressable onPress={openMonthPicker} className="flex-row items-center gap-1 py-1 px-2" hitSlop={4}>
                    <Text className="font-instrument-semibold text-[14px] text-onb-ink-headline dark:text-onb-ink-headline-dark">
                      {viewMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={!canGoNextMonth}
                    onPress={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                    hitSlop={8}
                    className="p-1.5"
                    style={{ opacity: canGoNextMonth ? 1 : 0.3 }}
                    accessibilityLabel="Next month"
                  >
                    <Icon name="chevron-right" size={16} color={c.inkBody} />
                  </Pressable>
                </View>

                <View className="flex-row mb-0.5">
                  {WEEKDAY_LABELS.map((w, i) => (
                    <Text
                      key={i}
                      className="flex-1 text-center font-instrument-semibold text-[10px] text-onb-ink-body dark:text-onb-ink-body-dark py-[3px]"
                    >
                      {w}
                    </Text>
                  ))}
                </View>

                {weeks.map((week, wi) => {
                  // Inset half a column at the real start/end so the tint stops at the circle's center.
                  let bandStartCol: number | null = null;
                  let bandEndCol: number | null = null;
                  if (rangeEnd && !isSameDay(rangeStart, rangeEnd)) {
                    week.forEach((day, i) => {
                      if (day >= rangeStart && day <= rangeEnd) {
                        if (bandStartCol === null) bandStartCol = i;
                        bandEndCol = i;
                      }
                    });
                  }
                  const startInset = bandStartCol !== null && isSameDay(week[bandStartCol], rangeStart) ? 0.5 : 0;
                  const endInset = bandEndCol !== null && rangeEnd && isSameDay(week[bandEndCol], rangeEnd) ? 0.5 : 0;
                  const bandLeft = bandStartCol !== null ? bandStartCol + startInset : 0;
                  const bandRight = bandEndCol !== null ? bandEndCol + 1 - endInset : 0;

                  return (
                    <View key={wi} className="flex-row relative">
                      {bandStartCol !== null && bandEndCol !== null && (
                        <View
                          pointerEvents="none"
                          className="absolute top-0 bottom-0"
                          style={{ left: `${(bandLeft / 7) * 100}%`, width: `${((bandRight - bandLeft) / 7) * 100}%`, backgroundColor: inRangeTint }}
                        />
                      )}
                      {week.map((day) => {
                        const inMonth = day.getMonth() === viewMonth.getMonth();
                        const disabled = (min !== null && day < min) || day > max;
                        const isStart = isSameDay(day, rangeStart);
                        const isEnd = rangeEnd ? isSameDay(day, rangeEnd) : false;
                        const isEdge = isStart || isEnd;

                        return (
                          <View key={day.getTime()} className="flex-1 aspect-square items-center justify-center">
                            <Pressable
                              disabled={disabled}
                              onPress={() => handleDayPress(day)}
                              className="absolute inset-0 items-center justify-center"
                            >
                              <View
                                key={isEdge ? 'on' : 'off'}
                                className={cn(
                                  'size-12 rounded-full items-center justify-center',
                                  isEdge && (isDark ? 'bg-onb-accent-primary-dark' : 'bg-onb-accent-primary'),
                                )}
                              >
                                <Text
                                  className={cn(
                                    'text-[12px]',
                                    isEdge ? 'font-instrument-semibold' : 'font-instrument',
                                    disabled || !inMonth
                                      ? 'text-onb-ink-label dark:text-onb-ink-label-dark'
                                      : isEdge
                                        ? 'text-onb-on-accent dark:text-onb-on-accent-dark'
                                        : 'text-onb-ink-headline dark:text-onb-ink-headline-dark',
                                  )}
                                >
                                  {day.getDate()}
                                </Text>
                              </View>
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </>
            )}

            {pickerView === 'months' && (
              <>
                <View className="flex-row items-center justify-between mb-3">
                  <Pressable
                    disabled={pickerYear <= minYear}
                    onPress={() => setPickerYear((y) => y - 1)}
                    hitSlop={8}
                    className="p-1.5"
                    style={{ opacity: pickerYear <= minYear ? 0.3 : 1 }}
                    accessibilityLabel="Previous year"
                  >
                    <Icon name="chevron-left" size={16} color={c.inkBody} />
                  </Pressable>
                  <Pressable onPress={() => setPickerView('years')} className="flex-row items-center gap-1 py-1 px-2" hitSlop={4}>
                    <Text className="font-instrument-semibold text-[14px] text-onb-ink-headline dark:text-onb-ink-headline-dark">
                      {pickerYear}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={pickerYear >= maxYear}
                    onPress={() => setPickerYear((y) => y + 1)}
                    hitSlop={8}
                    className="p-1.5"
                    style={{ opacity: pickerYear >= maxYear ? 0.3 : 1 }}
                    accessibilityLabel="Next year"
                  >
                    <Icon name="chevron-right" size={16} color={c.inkBody} />
                  </Pressable>
                </View>
                <View className="flex-row flex-wrap">
                  {MONTH_LABELS.map((label, monthIndex) => {
                    const monthStart = startOfMonth(new Date(pickerYear, monthIndex, 1));
                    const disabled = (minMonth && monthStart < minMonth) || monthStart > maxMonth;
                    const isCurrent = monthIndex === viewMonth.getMonth() && pickerYear === viewMonth.getFullYear();
                    return (
                      <View key={label} className="w-1/3 p-1">
                        <Pressable
                          disabled={disabled}
                          onPress={() => pickMonth(monthIndex)}
                          className={cn(
                            'rounded-inner py-3 items-center',
                            isCurrent && (isDark ? 'bg-onb-accent-primary-dark' : 'bg-onb-accent-primary'),
                          )}
                        >
                          <Text
                            className={cn(
                              'text-[13px]',
                              isCurrent ? 'font-instrument-semibold' : 'font-instrument',
                              disabled
                                ? 'text-onb-ink-label dark:text-onb-ink-label-dark'
                                : isCurrent
                                  ? 'text-onb-on-accent dark:text-onb-on-accent-dark'
                                  : 'text-onb-ink-headline dark:text-onb-ink-headline-dark',
                            )}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {pickerView === 'years' && (
              <>
                <Text className="font-instrument-semibold text-[14px] text-onb-ink-headline dark:text-onb-ink-headline-dark text-center mb-3">
                  Select year
                </Text>
                <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                  <View className="flex-row flex-wrap">
                    {Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).map((year) => {
                      const isCurrent = year === pickerYear;
                      return (
                        <View key={year} className="w-1/4 p-1">
                          <Pressable
                            onPress={() => pickYear(year)}
                            className={cn(
                              'rounded-inner py-3 items-center',
                              isCurrent && (isDark ? 'bg-onb-accent-primary-dark' : 'bg-onb-accent-primary'),
                            )}
                          >
                            <Text
                              className={cn(
                                'text-[13px]',
                                isCurrent ? 'font-instrument-semibold' : 'font-instrument',
                                isCurrent
                                  ? 'text-onb-on-accent dark:text-onb-on-accent-dark'
                                  : 'text-onb-ink-headline dark:text-onb-ink-headline-dark',
                              )}
                            >
                              {year}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            )}
          </View>

          <Text className="font-instrument text-[13px] text-onb-ink-body dark:text-onb-ink-body-dark mt-3 mb-md">
            {rangeEnd
              ? `${fmtShortYear(rangeStart)} – ${fmtShortYear(rangeEnd)} · ${dayCount} day${dayCount === 1 ? '' : 's'} selected`
              : `${fmtShortYear(rangeStart)} · pick an end date`}
          </Text>

          <RqButton
            label="Apply range"
            scheme={scheme}
            disabled={!rangeEnd}
            onPress={() => {
              if (rangeEnd) {
                onApply(rangeStart, rangeEnd);
                setPickerView('days');
              }
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
