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
import { PaystackWebViewModal } from '../../components/payments/PaystackWebViewModal';

export const BursarPayScreen = ({ navigation }: any) => {
  const { colors } = useAppTheme();

  const lookup = useStudentBillLookup();
  const { student, selectedBill, amount } = lookup;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paystack Modal State
  const [paystackVisible, setPaystackVisible] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [reference, setReference] = useState<string>('');

  const handleStartPayment = async () => {
    if (!student || !selectedBill) {
      setError('Find the student and choose the bill being paid');
      return;
    }

    const valCheck = isValidCurrencyAmount(amount);
    if (!valCheck.valid) {
      setError(valCheck.error || 'Invalid amount');
      return;
    }
    if (parseFloat(amount) > owingOn(selectedBill) + 0.001) {
      setError(`Amount is more than the ${formatGHS(owingOn(selectedBill))} left on ${selectedBill.util_name}`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await api.initiateOnlinePayment({
        student_id: student.student_id,
        bill_id: selectedBill.bill_id,
        amount: amount.trim(),
      });

      if (!res.authorization_url || !res.payment?.reference) {
        throw new Error('Could not obtain Paystack authorization page');
      }

      setAuthUrl(res.authorization_url);
      setReference(res.payment.reference);
      setPaystackVisible(true);
    } catch (err: any) {
      setError(err.message || 'Payment initiation failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePaystackSuccess = async (completedRef: string) => {
    setPaystackVisible(false);
    try {
      setLoading(true);
      const verified = await api.verifyOnlinePayment(completedRef);
      if (verified.status === 'completed') {
        Alert.alert('Payment Completed', `Payment of ${formatGHS(verified.amount)} has been verified.`, [
          {
            text: 'View Receipt',
            onPress: () =>
              navigation.navigate('Receipt', {
                payment: verified,
                studentId: verified.student_id ?? student?.student_id,
              }),
          },
        ]);
        lookup.refresh();
      } else {
        Alert.alert('Payment Status', `Transaction status: ${verified.status}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify transaction');
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
          Initiate Online Fee Payment
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Bursars pay online via Paystack so every payment leaves a verified digital audit trail
        </Text>
      </View>

      <AppCard style={styles.policyNotice}>
        <Text style={[styles.policyTitle, { color: colors.primary }]}>
          🔒 Anti-Leakage Payment Rule
        </Text>
        <Text style={[styles.policyText, { color: colors.textSecondary }]}>
          The system restricts bursars from taking unverified cash directly. All fee payments recorded by the bursar must go through Paystack.
        </Text>
      </AppCard>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <View style={styles.form}>
        <StudentBillForm lookup={lookup} />

        <AppButton
          title="Proceed to Paystack"
          variant="primary"
          size="lg"
          loading={loading}
          disabled={!selectedBill}
          onPress={handleStartPayment}
          style={{ marginTop: 12 }}
        />
      </View>

      {paystackVisible && (
        <PaystackWebViewModal
          visible={paystackVisible}
          authorizationUrl={authUrl}
          reference={reference}
          onSuccess={handlePaystackSuccess}
          onClose={() => setPaystackVisible(false)}
        />
      )}
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
    marginBottom: 14,
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
  policyNotice: {
    padding: 14,
    marginBottom: 16,
  },
  policyTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  policyText: {
    fontSize: 12,
    lineHeight: 16,
  },
  form: {
    marginTop: 4,
  },
});
