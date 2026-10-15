import React, { useState, useEffect } from 'react';
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
import { Utility } from '../../api/types';
import { isValidCurrencyAmount, formatGHS } from '../../utils/currency';
import { AppTextInput } from '../../components/common/AppTextInput';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { PaystackWebViewModal } from '../../components/payments/PaystackWebViewModal';

export const PayBillScreen = ({ route, navigation }: any) => {
  const { student, billId: initialBillId } = route.params;
  const { colors, typography, spacing } = useAppTheme();

  const [billId, setBillId] = useState<string>(initialBillId ? String(initialBillId) : '1');
  const [amount, setAmount] = useState<string>('');
  const [utilities, setUtilities] = useState<Utility[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paystack Modal State
  const [paystackVisible, setPaystackVisible] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [reference, setReference] = useState<string>('');

  useEffect(() => {
    const loadUtilities = async () => {
      try {
        const list = await api.listUtilities();
        setUtilities(list || []);
      } catch (e) {
        // Not critical if list fails; user can input bill_id directly
        console.log('Utilities load error:', e);
      }
    };
    loadUtilities();
  }, []);

  const handleStartPayment = async () => {
    const parsedBillId = parseInt(billId, 10);
    if (isNaN(parsedBillId) || parsedBillId <= 0) {
      setError('Please provide a valid Bill ID');
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
        student_id: student.student_id,
        bill_id: parsedBillId,
        amount: amount.trim(),
      });

      if (!res.authorization_url || !res.payment?.reference) {
        throw new Error('Payment gateway initialization failed');
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
        Alert.alert('Payment Successful!', `Your payment of ${formatGHS(verified.amount)} has been confirmed.`, [
          {
            text: 'View Receipt',
            onPress: () =>
              navigation.replace('Receipt', {
                payment: verified,
                studentName: `${student.fname} ${student.lname}`,
                studentId: student.student_id,
              }),
          },
        ]);
      } else {
        Alert.alert(
          'Payment Status',
          `Payment is currently ${verified.status}. If you completed it, it will update shortly.`
        );
      }
    } catch (err: any) {
      setError(err.message || 'Payment verification failed');
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
        <AppCard style={styles.childHeader}>
          <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>
            Paying Fees For
          </Text>
          <Text style={[styles.childName, { color: colors.textPrimary }]}>
            {student.fname} {student.lname}
          </Text>
          <Text style={[styles.childMeta, { color: colors.textMuted }]}>
            Student ID: {student.student_id} • Grade {student.grade}
          </Text>
        </AppCard>

        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        <View style={styles.form}>
          <AppTextInput
            label="Bill ID"
            value={billId}
            onChangeText={setBillId}
            keyboardType="number-pad"
            placeholder="e.g. 1 (Tuition fee)"
            hint="Enter the bill ID assigned for this semester"
          />

          <AppTextInput
            label="Payment Amount (GH₵)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="e.g. 150.00"
            hint="Enter exact amount (max 2 decimal places). Full or partial payment accepted."
          />

          <View style={[styles.noticeBox, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              💡 Online payments are securely processed by Paystack using Mobile Money (MTN, Telecel, AT) or Visa/Mastercard.
            </Text>
          </View>

          <AppButton
            title={`Proceed to Pay ${amount ? formatGHS(amount) : ''}`}
            variant="primary"
            size="lg"
            loading={loading}
            onPress={handleStartPayment}
            style={styles.payBtn}
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
  childHeader: {
    padding: 16,
    marginBottom: 16,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  childName: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  childMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  form: {
    marginTop: 8,
  },
  noticeBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 12,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
  },
  payBtn: {
    marginTop: 12,
  },
});
