import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useAppTheme } from '../../contexts/ThemeContext';
import { KEYBOARD_BOTTOM_OFFSET } from '../../constants/keyboard';
import { api } from '../../api/client';
import { StudentBill } from '../../api/types';
import { isValidCurrencyAmount, formatGHS } from '../../utils/currency';
import { AppTextInput } from '../../components/common/AppTextInput';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { SemesterBillPicker, initialBill, owingOn } from '../../components/payments/SemesterBillPicker';
import { PaystackWebViewModal } from '../../components/payments/PaystackWebViewModal';

export const PayBillScreen = ({ route, navigation }: any) => {
  const { student, billId: initialBillId } = route.params;
  const { colors } = useAppTheme();

  const [bills, setBills] = useState<StudentBill[]>([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paystack Modal State
  const [paystackVisible, setPaystackVisible] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [reference, setReference] = useState<string>('');

  const selectBill = (b: StudentBill) => {
    setSelectedBillId(b.bill_id);
    setAmount(owingOn(b).toFixed(2));
    setError(null);
  };

  // state is only set in the promise callbacks, so the mount effect below doesn't set state synchronously
  const loadBills = useCallback(
    () =>
      api
        .getStudentBills(student.student_id)
        .then((res) => {
          setBills(res.bills);
          // Preselect the bill the parent tapped; the picker opens on its semester
          const initial = initialBillId !== undefined ? initialBill(res.bills, initialBillId) : undefined;
          if (initial) {
            setSelectedBillId(initial.bill_id);
            setAmount(owingOn(initial).toFixed(2));
          }
        })
        .catch((err: any) => setError(err.message || 'Failed to load bills for this student'))
        .finally(() => setBillsLoading(false)),
    [student.student_id, initialBillId]
  );

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  const selectedBill = bills.find((b) => b.bill_id === selectedBillId) ?? null;

  const handleStartPayment = async () => {
    if (!selectedBill) {
      setError('Please choose the bill you want to pay');
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

  if (billsLoading) {
    return <LoadingSpinner message="Loading bills..." />;
  }

  return (
    <KeyboardAwareScrollView
      bottomOffset={KEYBOARD_BOTTOM_OFFSET}
      keyboardShouldPersistTaps="handled"
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scroll}
    >
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

      {bills.length === 0 ? (
        <AppCard style={styles.emptyCard} variant="outlined">
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No bills yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {"The school hasn't published any bills for this student."}
          </Text>
          <AppButton title="Retry" variant="outline" size="sm" onPress={() => {
              setError(null);
              loadBills();
            }}
            style={{ marginTop: 12 }} />
        </AppCard>
      ) : (
        <>
          <SemesterBillPicker bills={bills} selectedBillId={selectedBillId} onSelect={selectBill} />

          {selectedBill && (
            <View style={styles.form}>
              <AppTextInput
                label={`Amount for ${selectedBill.util_name} (GH₵)`}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="e.g. 150.00"
                hint={`Up to ${formatGHS(owingOn(selectedBill))}. Full or partial payment accepted.`}
              />
              {parseFloat(amount || '0') !== owingOn(selectedBill) && (
                <TouchableOpacity onPress={() => setAmount(owingOn(selectedBill).toFixed(2))} hitSlop={8}>
                  <Text style={[styles.fullBalance, { color: colors.primary }]}>
                    Pay full balance ({formatGHS(owingOn(selectedBill))})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={[styles.noticeBox, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              💡 Online payments are securely processed by Paystack using Mobile Money (MTN, Telecel, AT) or Visa/Mastercard.
            </Text>
          </View>

          <AppButton
            title={selectedBill ? `Proceed to Pay ${amount ? formatGHS(amount) : ''}` : 'Select a bill above'}
            variant="primary"
            size="lg"
            loading={loading}
            disabled={!selectedBill}
            onPress={handleStartPayment}
            style={styles.payBtn}
          />
        </>
      )}

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
    paddingBottom: 32,
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
  fullBalance: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: -4,
    marginBottom: 4,
  },
  emptyCard: {
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
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
