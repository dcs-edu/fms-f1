import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { formatGHS } from '../../utils/currency';
import { useStudentBillLookup } from '../../hooks/useStudentBillLookup';
import { AppTextInput } from '../common/AppTextInput';
import { AppButton } from '../common/AppButton';
import { AppCard } from '../common/AppCard';
import { SemesterBillPicker, owingOn } from './SemesterBillPicker';

export interface StudentBillFormProps {
  lookup: ReturnType<typeof useStudentBillLookup>;
}

/** Student ID -> that student's bills -> one bill and an amount. The screen adds its own submit button. */
export const StudentBillForm: React.FC<StudentBillFormProps> = ({ lookup }) => {
  const { colors } = useAppTheme();
  const { student, bills, selectedBill } = lookup;

  return (
    <View>
      <View style={styles.lookupRow}>
        <AppTextInput
          label="Student Card ID"
          placeholder="e.g. 30-0042"
          value={lookup.studentId}
          onChangeText={lookup.setStudentId}
          autoCapitalize="characters"
          returnKeyType="search"
          onSubmitEditing={lookup.lookup}
          error={lookup.lookupError ?? undefined}
          containerStyle={styles.lookupInput}
        />
        <AppButton
          title="Find"
          variant="outline"
          loading={lookup.looking}
          onPress={lookup.lookup}
          style={styles.findBtn}
        />
      </View>

      {student && (
        <>
          <AppCard style={styles.studentCard} variant="subtle">
            <Text style={[styles.studentName, { color: colors.textPrimary }]}>
              {student.fname} {student.lname}
            </Text>
            <Text style={[styles.studentMeta, { color: colors.textMuted }]}>
              Student ID: {student.student_id} • Grade {student.grade}
            </Text>
          </AppCard>

          {bills.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              No bills have been published for this student yet.
            </Text>
          ) : (
            <SemesterBillPicker
              // remount on a new student so the semester tabs start on their bills
              key={student.student_id}
              bills={bills}
              selectedBillId={selectedBill?.bill_id ?? null}
              onSelect={lookup.selectBill}
            />
          )}

          {selectedBill && (
            <View style={styles.amount}>
              <AppTextInput
                label={`Amount for ${selectedBill.util_name} (GH₵)`}
                value={lookup.amount}
                onChangeText={lookup.setAmount}
                keyboardType="decimal-pad"
                placeholder="e.g. 150.00"
                hint={`Up to ${formatGHS(owingOn(selectedBill))}. Full or partial payment accepted.`}
              />
              {parseFloat(lookup.amount || '0') !== owingOn(selectedBill) && (
                <TouchableOpacity onPress={() => lookup.setAmount(owingOn(selectedBill).toFixed(2))} hitSlop={8}>
                  <Text style={[styles.fullBalance, { color: colors.primary }]}>
                    Use full balance ({formatGHS(owingOn(selectedBill))})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  lookupRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  lookupInput: {
    flex: 1,
  },
  findBtn: {
    // line the button up with the input box, below its label
    marginTop: 24,
  },
  studentCard: {
    padding: 14,
    marginBottom: 16,
  },
  studentName: {
    fontSize: 17,
    fontWeight: '800',
  },
  studentMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  empty: {
    fontSize: 13,
    marginBottom: 12,
  },
  amount: {
    marginTop: 8,
  },
  fullBalance: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: -4,
    marginBottom: 4,
  },
});
