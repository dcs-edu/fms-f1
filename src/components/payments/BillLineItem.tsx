import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../contexts/ThemeContext';
import { StudentBill } from '../../api/types';
import { formatGHS } from '../../utils/currency';
import { toNumber } from '../../utils/finance';
import { AppBadge } from '../common/AppBadge';

export interface BillLineItemProps {
  bill: StudentBill;
  /** Pass a boolean to show the row as a radio choice; leave undefined for a plain row. */
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

/** One fee for one student: price, paid, owing and a progress bar. Tappable when `onPress` is set. */
export const BillLineItem: React.FC<BillLineItemProps> = ({ bill, selected, onPress, style }) => {
  const { colors } = useAppTheme();

  const price = toNumber(bill.amount);
  const paid = toNumber(bill.paid);
  const owing = Math.max(toNumber(bill.remaining), 0);
  const cleared = owing <= 0;
  const progress = price > 0 ? Math.min(paid / price, 1) : 1;

  const badge = cleared
    ? { label: 'Paid', variant: 'success' as const }
    : paid > 0
    ? { label: 'Part paid', variant: 'warning' as const }
    : { label: 'Unpaid', variant: 'error' as const };

  const body = (
    <View
      style={[
        styles.item,
        {
          backgroundColor: selected ? colors.primaryContainer : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
        style,
      ]}
    >
      <View style={styles.titleRow}>
        {selected !== undefined && (
          <Ionicons
            name={selected ? 'radio-button-on' : 'radio-button-off'}
            size={18}
            color={cleared ? colors.textMuted : colors.primary}
            style={styles.radio}
          />
        )}
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {bill.util_name}
        </Text>
        <AppBadge label={badge.label} variant={badge.variant} size="sm" />
        {onPress && selected === undefined && !cleared && (
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        )}
      </View>

      <View style={[styles.track, { backgroundColor: colors.surfaceVariant }]}>
        <View
          style={[
            styles.fill,
            { width: `${progress * 100}%`, backgroundColor: cleared ? colors.success : colors.warning },
          ]}
        />
      </View>

      <View style={styles.figures}>
        <View>
          <Text style={[styles.figLabel, { color: colors.textMuted }]}>Total</Text>
          <Text style={[styles.figValue, { color: colors.textPrimary }]}>{formatGHS(price)}</Text>
        </View>
        <View style={styles.center}>
          <Text style={[styles.figLabel, { color: colors.textMuted }]}>Paid</Text>
          <Text style={[styles.figValue, { color: colors.success }]}>{formatGHS(paid)}</Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.figLabel, { color: colors.textMuted }]}>Owing</Text>
          <Text style={[styles.figValue, { color: cleared ? colors.textMuted : colors.error }]}>
            {formatGHS(owing)}
          </Text>
        </View>
      </View>
    </View>
  );

  if (!onPress) return body;
  return (
    <TouchableOpacity onPress={onPress} disabled={cleared} activeOpacity={0.7} style={cleared && styles.disabled}>
      {body}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  item: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radio: {
    marginRight: -2,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 10,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  figures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  center: {
    alignItems: 'center',
  },
  right: {
    alignItems: 'flex-end',
  },
  figLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  figValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  disabled: {
    opacity: 0.6,
  },
});
