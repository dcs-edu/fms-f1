import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { StudentBill } from '../../api/types';
import { formatGHS } from '../../utils/currency';
import { groupBillsBySemester, toNumber } from '../../utils/finance';
import { BillLineItem } from './BillLineItem';

export const owingOn = (b: StudentBill) => Math.max(toNumber(b.remaining), 0);

/** The bill to open on: the requested one if it still has money owing, else the first that does. */
export const initialBill = (bills: StudentBill[], billId?: number): StudentBill | undefined =>
  bills.find((b) => b.bill_id === billId && owingOn(b) > 0) ?? bills.find((b) => owingOn(b) > 0);

export interface SemesterBillPickerProps {
  bills: StudentBill[];
  selectedBillId: number | null;
  onSelect: (bill: StudentBill) => void;
}

/** One student's bills by semester, with that semester's totals; tap a bill to choose it. */
export const SemesterBillPicker: React.FC<SemesterBillPickerProps> = ({ bills, selectedBillId, onSelect }) => {
  const { colors } = useAppTheme();
  const semesters = useMemo(() => groupBillsBySemester(bills), [bills]);
  // start on the selected bill's semester, else the first one still owing
  const [sem, setSem] = useState<string | null>(
    () => (bills.find((b) => b.bill_id === selectedBillId) ?? initialBill(bills) ?? bills[0])?.sem ?? null
  );
  const activeSem = semesters.find((s) => s.sem === sem) ?? semesters[0];

  if (!activeSem) return null;

  return (
    <View>
      {semesters.length > 1 && (
        <View style={styles.semPills}>
          {semesters.map((s) => (
            <TouchableOpacity
              key={s.sem}
              onPress={() => setSem(s.sem)}
              style={[
                styles.semPill,
                { backgroundColor: activeSem.sem === s.sem ? colors.primary : colors.surfaceVariant },
              ]}
            >
              <Text
                style={{
                  color: activeSem.sem === s.sem ? '#FFFFFF' : colors.textPrimary,
                  fontSize: 12,
                  fontWeight: '600',
                }}
              >
                {s.sem}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={[styles.semSummary, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.semTitle, { color: colors.textPrimary }]}>{activeSem.sem} bills</Text>
        <View style={styles.semFigures}>
          <View>
            <Text style={[styles.semLabel, { color: colors.textMuted }]}>Total</Text>
            <Text style={[styles.semValue, { color: colors.textPrimary }]}>{formatGHS(activeSem.totalPrice)}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.semLabel, { color: colors.textMuted }]}>Paid</Text>
            <Text style={[styles.semValue, { color: colors.success }]}>{formatGHS(activeSem.totalPaid)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.semLabel, { color: colors.textMuted }]}>Owing</Text>
            <Text style={[styles.semValue, { color: colors.error }]}>{formatGHS(activeSem.totalRemaining)}</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Choose a bill to pay</Text>
      {activeSem.bills.map((b) => (
        <BillLineItem
          key={b.bill_id}
          bill={b}
          selected={b.bill_id === selectedBillId}
          onPress={() => onSelect(b)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  semPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  semPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  semSummary: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  semTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  semFigures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  semLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  semValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
});
