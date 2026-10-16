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
import { isValidStudentID } from '../../utils/studentId';
import { isValidCurrencyAmount, formatGHS } from '../../utils/currency';
import { AppTextInput } from '../../components/common/AppTextInput';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { ErrorBanner } from '../../components/common/ErrorBanner';

export const CashPaymentScreen = ({ navigation }: any) => {
  const { colors } = useAppTheme();

  const [studentId, setStudentId] = useState('');
  const [billId, setBillId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRecordCash = async () => {
    if (!isValidStudentID(studentId.trim())) {
      setError('Student ID must match YY-NNNN format (e.g. 30-0042)');
      return;
    }

    const parsedBillId = parseInt(billId, 10);
    if (isNaN(parsedBillId) || parsedBillId <= 0) {
      setError('Please provide a valid numeric Bill ID');
      return;
    }

    const valCheck = isValidCurrencyAmount(amount);
    if (!valCheck.valid) {
      setError(valCheck.error || 'Invalid payment amount');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payment = await api.recordCashPayment({
        student_id: studentId.trim(),
        bill_id: parsedBillId,
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
                studentId: studentId.trim(),
              }),
          },
        ]
      );

      setAmount('');
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
        <AppTextInput
          label="Student Card ID"
          placeholder="e.g. 30-0042"
          value={studentId}
          onChangeText={setStudentId}
          autoCapitalize="characters"
          hint="Printed on student ID card"
        />

        <AppTextInput
          label="Bill ID"
          placeholder="e.g. 1"
          value={billId}
          onChangeText={setBillId}
          keyboardType="number-pad"
          hint="Utility price ID (tuition, feeding, etc.)"
        />

        <AppTextInput
          label="Amount Collected (GH₵)"
          placeholder="e.g. 150.00"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          hint="Maximum 2 decimal places"
        />

        <AppButton
          title="Record Cash & Issue Receipt"
          variant="primary"
          size="lg"
          loading={loading}
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
