import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import { Bill, DateRangeKey, Payment, PaymentQuery, PaymentStatus } from '../../api/types';
import { formatGHS } from '../../utils/currency';
import { billLabel, formatShortDate, payerLabel, sumCompleted, toNumber } from '../../utils/finance';
import { AppCard } from '../../components/common/AppCard';
import { AppTextInput } from '../../components/common/AppTextInput';
import { AppButton } from '../../components/common/AppButton';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { StatusPill } from '../../components/payments/StatusPill';
import { RangeSelector } from '../../components/finance/RangeSelector';

type RangeChoice = DateRangeKey | 'custom';
type StatusFilter = 'all' | PaymentStatus;

const RANGES: { key: RangeChoice; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'this_week', label: 'This week' },
  { key: 'this_month', label: 'This month' },
  { key: 'three_months_to_date', label: 'Last 3 months' },
  { key: 'custom', label: 'Custom' },
];

const STATUSES: { key: StatusFilter; label: string }[] = [
  { key: 'completed', label: 'Completed' },
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
];

const COLUMNS = [
  { key: 'date', label: 'Date', width: 110 },
  { key: 'student', label: 'Student', width: 140 },
  { key: 'bill', label: 'Bill', width: 150 },
  { key: 'method', label: 'Method', width: 72 },
  { key: 'status', label: 'Status', width: 100 },
  { key: 'amount', label: 'Amount (GH₵)', width: 110 },
] as const;
const TABLE_WIDTH = COLUMNS.reduce((w, c) => w + c.width, 0);
const ROW_PADDING = 12;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const isValidDay = (s: string) => ISO_DAY.test(s) && !isNaN(new Date(`${s}T00:00:00`).getTime());
const pad = (n: number) => String(n).padStart(2, '0');
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const monthStart = () => `${today().slice(0, 8)}01`;

/** Every payment in a chosen timeframe, as a table with totals. Admin and principal only. */
export const PaymentsReportScreen = ({ navigation }: any) => {
  const { colors } = useAppTheme();

  const [range, setRange] = useState<RangeChoice>('this_month');
  const [fromDay, setFromDay] = useState(monthStart());
  const [toDay, setToDay] = useState(today());
  const [query, setQuery] = useState<PaymentQuery>({ range: 'this_month' });
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>('completed');

  const [payments, setPayments] = useState<Payment[]>([]);
  const [bills, setBills] = useState<Map<number, Bill>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, b] = await Promise.all([api.getPayments(query), api.getBills().catch(() => [] as Bill[])]);
      setError(null);
      setPayments([...p].sort((x, y) => y.created_at.localeCompare(x.created_at)));
      setBills(new Map(b.map((bill) => [bill.bill_id, bill])));
    } catch (err: any) {
      setPayments([]);
      setError(
        'from' in query
          ? `${err.message || 'Request failed'}. Custom date ranges need the backend to accept ?from=&to= on GET /payments.`
          : err.message || 'Failed to load payments'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [query]);

  // also reruns when `load` changes, i.e. when a new timeframe is picked
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const chooseRange = (key: RangeChoice) => {
    setRange(key);
    if (key !== 'custom' && !('range' in query && query.range === key)) {
      setLoading(true);
      setQuery({ range: key });
    }
  };

  const applyCustom = () => {
    if (!isValidDay(fromDay) || !isValidDay(toDay)) {
      setRangeError('Use the format YYYY-MM-DD, e.g. 2026-09-01');
      return;
    }
    if (fromDay > toDay) {
      setRangeError('The start date must be on or before the end date');
      return;
    }
    setRangeError(null);
    setLoading(true);
    setQuery({ from: fromDay, to: toDay });
  };

  const rows = useMemo(
    () => (status === 'all' ? payments : payments.filter((p) => p.status === status)),
    [payments, status]
  );
  const collected = sumCompleted(payments);
  const completedCount = payments.filter((p) => p.status === 'completed').length;
  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const failedCount = payments.filter((p) => p.status === 'failed').length;
  const rowsTotal = rows.reduce((s, p) => s + toNumber(p.amount), 0);

  const periodLabel =
    'from' in query
      ? `${formatShortDate(`${query.from}T00:00:00`)} – ${formatShortDate(`${query.to}T00:00:00`)}`
      : RANGES.find((r) => r.key === query.range)?.label;

  const headerCell = (label: string, width: number, align: 'left' | 'right' = 'left') => (
    <Text key={label} style={[styles.th, { width, textAlign: align, color: colors.textSecondary }]}>
      {label}
    </Text>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.block}>
        <RangeSelector options={RANGES} value={range} onChange={chooseRange} />
      </View>

      {range === 'custom' && (
        <AppCard style={styles.customCard} variant="outlined">
          <View style={styles.customRow}>
            <AppTextInput
              label="From"
              value={fromDay}
              onChangeText={setFromDay}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
              autoCorrect={false}
              containerStyle={styles.customInput}
            />
            <AppTextInput
              label="To"
              value={toDay}
              onChangeText={setToDay}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
              autoCorrect={false}
              containerStyle={styles.customInput}
            />
          </View>
          {rangeError && <Text style={[styles.rangeError, { color: colors.error }]}>{rangeError}</Text>}
          <AppButton title="Apply range" size="sm" onPress={applyCustom} />
        </AppCard>
      )}

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <AppCard style={styles.summary}>
        <Text style={[styles.summaryLabel, { color: colors.currencyText }]}>
          Total collected • {periodLabel}
        </Text>
        <Text style={[styles.summaryTotal, { color: colors.currencyText }]}>{formatGHS(collected)}</Text>
        <View style={styles.summaryRow}>
          {[
            { n: completedCount, label: 'Completed', color: colors.success },
            { n: pendingCount, label: 'Pending', color: colors.pending },
            { n: failedCount, label: 'Failed', color: colors.error },
          ].map((s) => (
            <View key={s.label} style={styles.summaryStat}>
              <Text style={[styles.summaryCount, { color: s.color }]}>{s.n}</Text>
              <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      </AppCard>

      <View style={styles.block}>
        <RangeSelector options={STATUSES} value={status} onChange={setStatus} />
      </View>

      {loading ? (
        <LoadingSpinner message="Loading payments..." />
      ) : rows.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={36} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No payments in this timeframe.</Text>
        </View>
      ) : (
        <AppCard style={styles.tableCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={{ width: TABLE_WIDTH + ROW_PADDING * 2 }}>
              <View style={[styles.tr, { backgroundColor: colors.surfaceVariant }]}>
                {COLUMNS.map((c) => headerCell(c.label, c.width, c.key === 'amount' ? 'right' : 'left'))}
              </View>
              {rows.map((p) => (
                <TouchableOpacity
                  key={p.txn_id}
                  onPress={() => navigation.navigate('Receipt', { payment: p, studentId: p.student_id ?? p.admission_no })}
                  style={[styles.tr, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
                >
                  <Text style={[styles.td, { width: COLUMNS[0].width, color: colors.textSecondary }]}>
                    {formatShortDate(p.paid_at ?? p.created_at, true)}
                  </Text>
                  <Text style={[styles.td, { width: COLUMNS[1].width, color: colors.textPrimary }]} numberOfLines={1}>
                    {payerLabel(p)}
                  </Text>
                  <Text style={[styles.td, { width: COLUMNS[2].width, color: colors.textPrimary }]} numberOfLines={1}>
                    {billLabel(bills, p.bill_id)}
                  </Text>
                  <Text style={[styles.td, { width: COLUMNS[3].width, color: colors.textSecondary }]}>
                    {p.reference ? 'Online' : 'Cash'}
                  </Text>
                  <View style={{ width: COLUMNS[4].width }}>
                    <StatusPill status={p.status} />
                  </View>
                  <Text
                    style={[styles.td, styles.amount, { width: COLUMNS[5].width, color: colors.textPrimary }]}
                  >
                    {toNumber(p.amount).toFixed(2)}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={[styles.tr, { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.th, { width: TABLE_WIDTH - COLUMNS[5].width, color: colors.textPrimary }]}>
                  Total ({rows.length} {rows.length === 1 ? 'payment' : 'payments'})
                </Text>
                <Text style={[styles.th, styles.amount, { width: COLUMNS[5].width, color: colors.textPrimary }]}>
                  {rowsTotal.toFixed(2)}
                </Text>
              </View>
            </View>
          </ScrollView>
        </AppCard>
      )}
      {status !== 'completed' && rows.length > 0 && (
        <Text style={[styles.note, { color: colors.textMuted }]}>
          The table total includes pending/failed attempts; only completed payments count as money collected.
        </Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  block: {
    marginBottom: 12,
  },
  customCard: {
    padding: 14,
    marginTop: 0,
    marginBottom: 12,
  },
  customRow: {
    flexDirection: 'row',
    gap: 10,
  },
  customInput: {
    flex: 1,
    marginBottom: 8,
  },
  rangeError: {
    fontSize: 12,
    marginBottom: 8,
  },
  summary: {
    padding: 16,
    marginTop: 0,
    marginBottom: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  summaryTotal: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryCount: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  tableCard: {
    padding: 0,
    marginTop: 0,
    overflow: 'hidden',
  },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: ROW_PADDING,
  },
  th: {
    fontSize: 12,
    fontWeight: '700',
    paddingRight: 8,
  },
  td: {
    fontSize: 12,
    paddingRight: 8,
  },
  amount: {
    textAlign: 'right',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  empty: {
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
  },
  note: {
    fontSize: 11,
    marginTop: 8,
    lineHeight: 15,
  },
});
