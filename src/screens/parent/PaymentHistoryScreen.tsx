import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import { Std, Payment, DateRangeKey } from '../../api/types';
import { formatGHS } from '../../utils/currency';
import { AppCard } from '../../components/common/AppCard';
import { StatusPill } from '../../components/payments/StatusPill';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const DATE_RANGES: { key: DateRangeKey; label: string }[] = [
  { key: 'this_month', label: 'This Month' },
  { key: 'today', label: 'Today' },
  { key: 'this_week', label: 'This Week' },
  { key: 'three_months_to_date', label: '3 Months' },
];

export const PaymentHistoryScreen = ({ navigation }: any) => {
  const { colors } = useAppTheme();

  const [children, setChildren] = useState<Std[]>([]);
  const [selectedChild, setSelectedChild] = useState<Std | null>(null);
  const [range, setRange] = useState<DateRangeKey>('this_month');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const kids = await api.getMyChildren();
      setChildren(kids || []);

      if (kids && kids.length > 0) {
        const activeKid = selectedChild || kids[0];
        if (!selectedChild) setSelectedChild(activeKid);
        const history = await api.getStudentPaymentHistory(activeKid.student_id, range);
        setPayments(history.payments || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payment records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedChild, range]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSelectChild = async (kid: Std) => {
    setSelectedChild(kid);
    setLoading(true);
    try {
      const history = await api.getStudentPaymentHistory(kid.student_id, range);
      setPayments(history.payments || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payments for selected child');
    } finally {
      setLoading(false);
    }
  };

  if (loading && children.length === 0) {
    return <LoadingSpinner message="Loading payments..." />;
  }

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
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Payment History
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Verified payment receipts across your children's billing records
            </Text>

            {children.length > 1 && (
              <View style={styles.childPills}>
                {children.map((k) => (
                  <TouchableOpacity
                    key={k.student_id}
                    onPress={() => handleSelectChild(k)}
                    style={[
                      styles.childPill,
                      {
                        backgroundColor:
                          selectedChild?.student_id === k.student_id
                            ? colors.primary
                            : colors.surfaceVariant,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color:
                          selectedChild?.student_id === k.student_id
                            ? '#FFFFFF'
                            : colors.textPrimary,
                        fontSize: 13,
                        fontWeight: '600',
                      }}
                    >
                      {k.fname} {k.lname}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

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
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🧾</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Transactions Found
              </Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No fee payments recorded for the selected time range.
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
                studentName: selectedChild ? `${selectedChild.fname} ${selectedChild.lname}` : '',
                studentId: selectedChild?.student_id,
              })
            }
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.amount, { color: colors.textPrimary }]}>
                  {formatGHS(item.amount)}
                </Text>
                <Text style={[styles.date, { color: colors.textMuted }]}>
                  {new Date(item.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <StatusPill status={item.status} />
            </View>
            <View style={styles.cardFooter}>
              <Text style={[styles.channel, { color: colors.textSecondary }]}>
                {item.reference ? 'Paystack Online' : 'Cash'}
              </Text>
              <Text style={[styles.tapReceipt, { color: colors.primary }]}>
                View Receipt &gt;
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
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  childPills: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  childPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
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
  paymentCard: {
    padding: 14,
    marginVertical: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  date: {
    fontSize: 12,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2ECE5',
  },
  channel: {
    fontSize: 12,
  },
  tapReceipt: {
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    padding: 32,
    marginTop: 20,
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
});
