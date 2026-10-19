import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import { Payment, DateRangeKey, StudentBill } from '../../api/types';
import { formatGHS } from '../../utils/currency';
import { groupBillsBySemester, totalRemaining, toNumber } from '../../utils/finance';
import { AppCard } from '../../components/common/AppCard';
import { AppButton } from '../../components/common/AppButton';
import { StatusPill } from '../../components/payments/StatusPill';
import { BillLineItem } from '../../components/payments/BillLineItem';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const DATE_RANGES: { key: DateRangeKey; label: string }[] = [
  { key: 'this_month', label: 'This Month' },
  { key: 'today', label: 'Today' },
  { key: 'this_week', label: 'This Week' },
  { key: 'three_months_to_date', label: '3 Months' },
];

export const ChildDetailScreen = ({ route, navigation }: any) => {
  const { student } = route.params;
  const { colors, typography, spacing } = useAppTheme();

  const [range, setRange] = useState<DateRangeKey>('this_month');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bills, setBills] = useState<StudentBill[] | null>(null);
  const [billsError, setBillsError] = useState<string | null>(null);

  const fetchBills = useCallback(async () => {
    try {
      setBillsError(null);
      const res = await api.getStudentBills(student.student_id);
      setBills(res.bills);
    } catch (err: any) {
      setBillsError(err.message || 'Failed to load bills');
    }
  }, [student.student_id]);

  // refetch on focus so balances update after coming back from a payment
  useFocusEffect(
    useCallback(() => {
      fetchBills();
    }, [fetchBills])
  );

  const semesters = useMemo(() => groupBillsBySemester(bills ?? []), [bills]);
  const outstanding = totalRemaining(bills ?? []);
  const totalBilled = (bills ?? []).reduce((s, b) => s + toNumber(b.amount), 0);

  const fetchPayments = useCallback(async () => {
    try {
      setError(null);
      const res = await api.getStudentPaymentHistory(student.student_id, range);
      setPayments(res.payments || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch student payment ledger');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [student.student_id, range]);

  useEffect(() => {
    setLoading(true);
    fetchPayments();
  }, [fetchPayments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments();
    fetchBills();
  };

  const totalCompleted = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <FlatList
        data={payments}
        keyExtractor={(item) => item.txn_id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <AppCard style={styles.summaryCard}>
              <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
                Student Profile
              </Text>
              <Text style={[styles.studentName, { color: colors.textPrimary }]}>
                {student.fname} {student.lname}
              </Text>
              <Text style={[styles.studentMeta, { color: colors.textMuted }]}>
                ID: {student.student_id} • Grade {student.grade}
              </Text>

              {bills && (
                <View style={styles.balanceRow}>
                  <View style={[styles.balanceBox, { backgroundColor: colors.surfaceVariant }]}>
                    <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Billed</Text>
                    <Text style={[styles.balanceValue, { color: colors.textPrimary }]}>{formatGHS(totalBilled)}</Text>
                  </View>
                  <View style={[styles.balanceBox, { backgroundColor: outstanding > 0 ? colors.errorContainer : colors.successContainer }]}>
                    <Text style={[styles.totalLabel, { color: outstanding > 0 ? colors.error : colors.success }]}>
                      Outstanding
                    </Text>
                    <Text style={[styles.balanceValue, { color: outstanding > 0 ? colors.error : colors.success }]}>
                      {formatGHS(outstanding)}
                    </Text>
                  </View>
                </View>
              )}

              <AppButton
                title="Make a Payment Now"
                variant="primary"
                onPress={() => navigation.navigate('PayBill', { student })}
                style={{ marginTop: 14 }}
              />
            </AppCard>

            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              Fees & Bills
            </Text>
            {billsError ? (
              <Text style={[styles.emptyText, styles.billsMsg, { color: colors.error }]}>{billsError}</Text>
            ) : bills === null ? (
              <Text style={[styles.emptyText, styles.billsMsg, { color: colors.textMuted }]}>Loading bills...</Text>
            ) : semesters.length === 0 ? (
              <Text style={[styles.emptyText, styles.billsMsg, { color: colors.textMuted }]}>
                No bills have been published for this student yet.
              </Text>
            ) : (
              semesters.map((s) => (
                <View key={s.sem} style={styles.semBlock}>
                  <View style={styles.semHeader}>
                    <Text style={[styles.semTitle, { color: colors.textPrimary }]}>{s.sem}</Text>
                    <Text style={[styles.semMeta, { color: colors.textMuted }]}>
                      {formatGHS(s.totalPaid)} of {formatGHS(s.totalPrice)} paid
                      {s.totalRemaining > 0 ? ` • ${formatGHS(s.totalRemaining)} owing` : ''}
                    </Text>
                  </View>
                  {s.bills.map((b) => (
                    <BillLineItem
                      key={b.bill_id}
                      bill={b}
                      onPress={() => navigation.navigate('PayBill', { student, billId: b.bill_id })}
                    />
                  ))}
                </View>
              ))
            )}

            <View style={[styles.totalBox, { backgroundColor: colors.currencyBadge }]}>
              <Text style={[styles.totalLabel, { color: colors.currencyText }]}>
                Total Paid in Period ({range.replace(/_/g, ' ')})
              </Text>
              <Text style={[styles.totalValue, { color: colors.currencyText }]}>
                {formatGHS(totalCompleted.toFixed(2))}
              </Text>
            </View>

            <View style={styles.rangeSelector}>
              {DATE_RANGES.map((r) => (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => setRange(r.key)}
                  style={[
                    styles.rangePill,
                    {
                      backgroundColor: range === r.key ? colors.primary : colors.surfaceVariant,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: range === r.key ? '#FFFFFF' : colors.textPrimary,
                      fontSize: 12,
                      fontWeight: '600',
                    }}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              Transaction Ledger
            </Text>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No payments recorded for this time window.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <AppCard
            style={styles.paymentCard}
            onPress={() =>
              navigation.navigate('Receipt', {
                payment: item,
                studentName: `${student.fname} ${student.lname}`,
                studentId: student.student_id,
              })
            }
          >
            <View style={styles.paymentHeader}>
              <View>
                <Text style={[styles.paymentAmount, { color: colors.textPrimary }]}>
                  {formatGHS(item.amount)}
                </Text>
                <Text style={[styles.paymentDate, { color: colors.textMuted }]}>
                  {new Date(item.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <StatusPill status={item.status} />
            </View>

            <View style={styles.paymentFooter}>
              <Text style={[styles.paymentMethod, { color: colors.textSecondary }]}>
                {item.reference ? 'Online Paystack' : 'Cash Deposit'}
              </Text>
              <Text style={[styles.viewReceipt, { color: colors.primary }]}>
                Receipt &gt;
              </Text>
            </View>
          </AppCard>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  summaryCard: {
    padding: 18,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  studentName: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  studentMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  balanceBox: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  semBlock: {
    marginBottom: 8,
  },
  semHeader: {
    marginBottom: 8,
  },
  semTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  semMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  billsMsg: {
    marginBottom: 16,
  },
  totalBox: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  rangeSelector: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  rangePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  paymentCard: {
    padding: 14,
    marginVertical: 4,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  paymentDate: {
    fontSize: 12,
    marginTop: 2,
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2ECE5',
  },
  paymentMethod: {
    fontSize: 12,
    fontWeight: '500',
  },
  viewReceipt: {
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
});
