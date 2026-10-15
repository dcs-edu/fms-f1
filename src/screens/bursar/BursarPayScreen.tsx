import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import { isValidStudentID } from '../../utils/studentId';
import { isValidCurrencyAmount, formatGHS } from '../../utils/currency';
import { AppTextInput } from '../../components/common/AppTextInput';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { PaystackWebViewModal } from '../../components/payments/PaystackWebViewModal';

export const BursarPayScreen = ({ navigation }: any) => {
  const { colors } = useAppTheme();

  const [studentId, setStudentId] = useState('');
  const [billId, setBillId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paystack Modal State
  const [paystackVisible, setPaystackVisible] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [reference, setReference] = useState<string>('');

  const handleStartPayment = async () => {
    if (!isValidStudentID(studentId.trim())) {
      setError('Student ID must look like YY-NNNN (e.g. 30-0042)');
      return;
    }

    const parsedBillId = parseInt(billId, 10);
    if (isNaN(parsedBillId) || parsedBillId <= 0) {
      setError('Please provide a valid numeric Bill ID');
      return;
    }

    const valCheck = isValidCurrencyAmount(amount);
    if (!valCheck.valid) {
      setError(valCheck.error || 'Invalid amount');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await api.initiateOnlinePayment({
        student_id: studentId.trim(),
        bill_id: parsedBillId,
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
                studentId: studentId.trim(),
              }),
          },
        ]);
        setAmount('');
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
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
          <AppTextInput
            label="Student Card ID"
            placeholder="e.g. 30-0042"
            value={studentId}
            onChangeText={setStudentId}
            autoCapitalize="characters"
            hint="Printed on the student's ID card"
          />

          <AppTextInput
            label="Bill ID"
            placeholder="e.g. 1"
            value={billId}
            onChangeText={setBillId}
            keyboardType="number-pad"
            hint="Target utility bill semester price ID"
          />

          <AppTextInput
            label="Amount (GH₵)"
            placeholder="e.g. 250.00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            hint="Maximum 2 decimal digits"
          />

          <AppButton
            title="Proceed to Paystack"
            variant="primary"
            size="lg"
            loading={loading}
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
      </ScrollView>
    </KeyboardAvoidingView>
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
