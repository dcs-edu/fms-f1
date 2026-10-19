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
import { Payment, DateRangeKey } from '../../api/types';
import { formatGHS } from '../../utils/currency';
import { AppCard } from '../../components/common/AppCard';
import { StatusPill } from '../../components/payments/StatusPill';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const DATE_RANGES: { key: DateRangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'this_week', label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'three_months_to_date', label: '3 Months' },
];

export const LedgerScreen = ({ navigation }: any) => {
  const { colors } = useAppTheme();

  const [range, setRange] = useState<DateRangeKey>('this_month');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLedger = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getAllPayments(range);
      setPayments(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch financial ledger');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range]);

  useEffect(() => {
    setLoading(true);
    fetchLedger();
  }, [fetchLedger]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLedger();
  };

  const completedTotal = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const failedCount = payments.filter((p) => p.status === 'failed').length;

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
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Financial Ledger
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Complete audit trail of all collections and online attempts
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
                      fontWeight: '700',
                    }}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <AppCard style={styles.metricsCard}>
              <View style={styles.metricMain}>
                <Text style={[styles.metricLabel, { color: colors.currencyText }]}>
                  Verified Collections ({range.replace('_', ' ')})
                </Text>
                <Text style={[styles.metricTotal, { color: colors.currencyText }]}>
                  {formatGHS(completedTotal.toFixed(2))}
                </Text>
              </View>

              <View style={styles.metricRow}>
                <View style={styles.metricSub}>
                  <Text style={[styles.metricSubCount, { color: colors.pending }]}>
                    {pendingCount}
                  </Text>
                  <Text style={[styles.metricSubLabel, { color: colors.textSecondary }]}>
                    Pending
                  </Text>
                </View>

                <View style={styles.metricSub}>
                  <Text style={[styles.metricSubCount, { color: colors.error }]}>
                    {failedCount}
                  </Text>
                  <Text style={[styles.metricSubLabel, { color: colors.textSecondary }]}>
                    Failed
                  </Text>
                </View>

                <View style={styles.metricSub}>
                  <Text style={[styles.metricSubCount, { color: colors.primary }]}>
                    {payments.length}
                  </Text>
                  <Text style={[styles.metricSubLabel, { color: colors.textSecondary }]}>
                    Total Rows
                  </Text>
                </View>
              </View>
            </AppCard>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Transaction Records
            </Text>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>📊</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No transaction records found for this period.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <AppCard
            style={styles.card}
            onPress={() =>
              navigation.navigate('Receipt', {
                payment: item,
                studentId: item.student_id,
              })
            }
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.amount, { color: colors.textPrimary }]}>
                  {formatGHS(item.amount)}
                </Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  Bill #{item.bill_id} •{' '}
                  {new Date(item.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <StatusPill status={item.status} />
            </View>

            <View style={styles.cardFooter}>
              <Text style={[styles.channelText, { color: colors.textSecondary }]}>
                {item.reference ? 'Online Paystack' : 'Cash Deposit'}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.refText, styles.mono, { color: colors.textMuted }]}
              >
                {item.reference ? `Ref: ${item.reference.slice(0, 8)}...` : 'Cash'}
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
  },
  rangeSelector: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  rangePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  metricsCard: {
    padding: 16,
    marginBottom: 16,
  },
  metricMain: {
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2ECE5',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricTotal: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  metricSub: {
    alignItems: 'center',
  },
  metricSubCount: {
    fontSize: 16,
    fontWeight: '700',
  },
  metricSubLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  card: {
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
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2ECE5',
  },
  channelText: {
    fontSize: 12,
  },
  refText: {
    fontSize: 11,
  },
  mono: {
    fontFamily: 'monospace',
  },
  empty: {
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 13,
  },
});
