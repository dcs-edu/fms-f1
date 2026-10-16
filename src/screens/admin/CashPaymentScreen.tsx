import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useAppTheme } from '../../contexts/ThemeContext';
import { KEYBOARD_BOTTOM_OFFSET } from '../../constants/keyboard';
import { api } from '../../api/client';
import { isValidCurrencyAmount, formatGHS } from '../../utils/currency';
import { useStudentBillLookup } from '../../hooks/useStudentBillLookup';
import { owingOn } from '../../components/payments/SemesterBillPicker';
import { StudentBillForm } from '../../components/payments/StudentBillForm';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { ErrorBanner } from '../../components/common/ErrorBanner';

export const CashPaymentScreen = ({ navigation }: any) => {
  const { colors } = useAppTheme();

  const lookup = useStudentBillLookup();
  const { student, selectedBill, amount } = lookup;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRecordCash = async () => {
    if (!student || !selectedBill) {
      setError('Find the student and choose the bill being paid');
      return;
    }

    const valCheck = isValidCurrencyAmount(amount);
    if (!valCheck.valid) {
      setError(valCheck.error || 'Invalid payment amount');
      return;
    }
    if (parseFloat(amount) > owingOn(selectedBill) + 0.001) {
      setError(`Amount is more than the ${formatGHS(owingOn(selectedBill))} left on ${selectedBill.util_name}`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payment = await api.recordCashPayment({
        student_id: student.student_id,
        bill_id: selectedBill.bill_id,
        amount: amount.trim(),
      });

      Alert.alert(
        'Cash Payment Recorded',
        `Payment of ${formatGHS(payment.amount)} has been recorded and immediately marked completed.`,
        [
          {
            text: 'View Official Receipt',
            onPress: () =>
              navigation.navigate('Receipt', {
                payment,
                studentName: `${student.fname} ${student.lname}`,
                studentId: student.student_id,
              }),
          },
        ]
      );

      lookup.refresh();
    } catch (err: any) {
      setError(err.message || 'Cash payment recording failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      bottomOffset={KEYBOARD_BOTTOM_OFFSET}
      keyboardShouldPersistTaps="handled"
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scroll}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Record Physical Cash Payment
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Official cash desk: only admin and principal accounts can record cash collections
        </Text>
      </View>

      <AppCard style={styles.auditCard}>
        <Text style={[styles.auditTitle, { color: colors.primary }]}>
          ⚠️ Database Row-Locking & Overpayment Protection
        </Text>
        <Text style={[styles.auditText, { color: colors.textSecondary }]}>
          The system executes this transaction with an exclusive database row lock. If this amount exceeds the remaining balance on the bill, the backend will strictly reject the request.
        </Text>
      </AppCard>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <View style={styles.form}>
        <StudentBillForm lookup={lookup} />

        <AppButton
          title="Record Cash & Issue Receipt"
          variant="primary"
          size="lg"
          loading={loading}
          disabled={!selectedBill}
          onPress={handleRecordCash}
          style={{ marginTop: 12 }}
        />
      </View>
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  auditCard: {
    padding: 14,
    marginBottom: 16,
  },
  auditTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  auditText: {
    fontSize: 12,
    lineHeight: 16,
  },
  form: {
    marginTop: 4,
  },
});
