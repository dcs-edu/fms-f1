import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { groupBillsBySemester, toNumber } from '../../utils/finance';
import { AppTextInput } from '../../components/common/AppTextInput';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { BillLineItem } from '../../components/payments/BillLineItem';
import { PaystackWebViewModal } from '../../components/payments/PaystackWebViewModal';

const owingOn = (b: StudentBill) => Math.max(toNumber(b.remaining), 0);

export const PayBillScreen = ({ route, navigation }: any) => {
  const { student, billId: initialBillId } = route.params;
  const { colors } = useAppTheme();

  const [bills, setBills] = useState<StudentBill[]>([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [sem, setSem] = useState<string | null>(null);
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
          // Start on the requested bill, else the first semester that still has money owing
          const initial = res.bills.find((b) => b.bill_id === initialBillId && owingOn(b) > 0);
          const firstOwing = res.bills.find((b) => owingOn(b) > 0);
          setSem((initial ?? firstOwing ?? res.bills[0])?.sem ?? null);
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

  const semesters = useMemo(() => groupBillsBySemester(bills), [bills]);
  const activeSem = semesters.find((s) => s.sem === sem) ?? semesters[0];
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

      {semesters.length === 0 ? (
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
          {semesters.length > 1 && (
            <View style={styles.semPills}>
              {semesters.map((s) => (
                <TouchableOpacity
                  key={s.sem}
                  onPress={() => setSem(s.sem)}
                  style={[
                    styles.semPill,
                    { backgroundColor: activeSem?.sem === s.sem ? colors.primary : colors.surfaceVariant },
                  ]}
                >
                  <Text
                    style={{
                      color: activeSem?.sem === s.sem ? '#FFFFFF' : colors.textPrimary,
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

          {activeSem && (
            <>
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
                  onPress={() => selectBill(b)}
                />
              ))}
            </>
          )}

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
