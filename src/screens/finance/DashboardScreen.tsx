import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import { Bill, Payment, Std, StudentDebt } from '../../api/types';
import { formatGHS } from '../../utils/currency';
import {
  billLabel,
  formatShortDate,
  groupDebtsByStudent,
  owingByBill,
  payerLabel,
  paymentStanding,
  sumCompleted,
  toNumber,
} from '../../utils/finance';
import { GRADE_OPTIONS } from '../../constants/grades';
import { AppCard } from '../../components/common/AppCard';
import { AppBadge } from '../../components/common/AppBadge';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { StatusPill } from '../../components/payments/StatusPill';
import { DonutChart } from '../../components/charts/DonutChart';
import { MetricTile } from '../../components/finance/MetricTile';

type Source = 'students' | 'debts' | 'bills' | 'payments';

interface DashboardData {
  students: Std[] | null;
  debts: StudentDebt[] | null;
  bills: Bill[] | null;
  payments: Payment[] | null;
}

const EMPTY: DashboardData = { students: null, debts: null, bills: null, payments: null };

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/**
 * Overview for admin, principal and bursar. Each data source loads independently, so one
 * endpoint failing (e.g. a role the backend doesn't allow yet) only blanks its own section.
 */
export const DashboardScreen = ({ navigation }: any) => {
  const { role, user } = useAuth();
  const { colors } = useAppTheme();
  const isBursar = role === 'bursar';

  const [data, setData] = useState<DashboardData>(EMPTY);
  const [failed, setFailed] = useState<Partial<Record<Source, string>>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [students, debts, bills, payments] = await Promise.allSettled([
      api.getStudents(),
      api.getStudentDebts(),
      api.getBills(),
      api.getPayments({ range: 'this_month' }),
    ]);
    const pick = <T,>(r: PromiseSettledResult<T>) => (r.status === 'fulfilled' ? r.value : null);
    const why = (r: PromiseSettledResult<unknown>) =>
      r.status === 'rejected' ? (r.reason?.message as string) || 'Request failed' : undefined;

    setData({ students: pick(students), debts: pick(debts), bills: pick(bills), payments: pick(payments) });
    const f: Partial<Record<Source, string>> = {};
    const entries: [Source, PromiseSettledResult<unknown>][] = [
      ['students', students],
      ['debts', debts],
      ['bills', bills],
      ['payments', payments],
    ];
    for (const [k, r] of entries) {
      const msg = why(r);
      if (msg) f[k] = msg;
    }
    setFailed(f);
    setLoading(false);
    setRefreshing(false);
  }, []);

  // refetch whenever the dashboard comes back into view, e.g. after recording a payment
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const debtors = useMemo(() => (data.debts ? groupDebtsByStudent(data.debts) : []), [data.debts]);
  const billMap = useMemo(() => new Map((data.bills ?? []).map((b) => [b.bill_id, b])), [data.bills]);

  const totalStudents = data.students?.length ?? 0;
  const billCount = data.bills?.length ?? 0;
  const outstanding = debtors.reduce((s, d) => s + d.totalOwing, 0);
  const standing = paymentStanding(totalStudents, debtors, billCount);
  const collectedThisMonth = data.payments ? sumCompleted(data.payments) : 0;
  const pendingThisMonth = (data.payments ?? []).filter((p) => p.status === 'pending');

  // Every student is billed every active bill (that's how the backend computes debts).
  const totalBilled = totalStudents * (data.bills ?? []).reduce((s, b) => s + toNumber(b.amount), 0);
  const collectedOverall = Math.max(totalBilled - outstanding, 0);
  const collectionRate = percent(collectedOverall, totalBilled);

  const topBills = useMemo(() => (data.debts ? owingByBill(data.debts).slice(0, 4) : []), [data.debts]);
  const recent = useMemo(
    () =>
      [...(data.payments ?? [])]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 5),
    [data.payments]
  );

  const gradeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of data.students ?? []) counts.set(s.grade, (counts.get(s.grade) ?? 0) + 1);
    const order = GRADE_OPTIONS.map((g) => g.value);
    return Array.from(counts.entries()).sort(
      ([a], [b]) => (order.indexOf(a) + 1 || 999) - (order.indexOf(b) + 1 || 999)
    );
  }, [data.students]);
  const maxGradeCount = Math.max(1, ...gradeCounts.map(([, n]) => n));
  const gradeLabel = (g: string) => GRADE_OPTIONS.find((o) => o.value === g)?.label.replace(/\s*\(.*\)$/, '') ?? g;

  const haveStanding = data.students !== null && data.debts !== null && data.bills !== null;
  const allFailed = Object.keys(failed).length === 4;

  const openDebtors = () => navigation.navigate('Debtors');
  const openPayments = () => (isBursar ? navigation.navigate('LedgerTab') : navigation.navigate('PaymentsReport'));

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;

  const standingSegments = [
    { label: 'Fully paid', value: standing.fullyPaid, color: colors.success },
    { label: 'Part paid', value: standing.partlyPaid, color: colors.warning },
    { label: 'Not paid', value: standing.notPaid, color: colors.error },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
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
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting()}</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {user?.email ?? 'Dashboard'}
          </Text>
          <Text style={[styles.date, { color: colors.textMuted }]}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
        {role && <AppBadge label={role} role={role} size="md" />}
      </View>

      <ErrorBanner message={allFailed ? failed.payments ?? 'Could not load dashboard' : null} />

      {/* Students (admin & principal) */}
      {!isBursar && (
        <View style={styles.row}>
          <MetricTile
            label="Students"
            value={data.students ? String(totalStudents) : '—'}
            icon="people-outline"
            caption={data.bills ? `${billCount} active bill${billCount === 1 ? '' : 's'}` : undefined}
          />
          <MetricTile
            label="Owing fees"
            value={data.debts ? String(debtors.length) : '—'}
            icon="alert-circle-outline"
            tone="warning"
            caption={data.students && data.debts ? `${percent(debtors.length, totalStudents)}% of students` : undefined}
            onPress={data.debts ? openDebtors : undefined}
          />
        </View>
      )}

      {/* Fee standing donut */}
      <AppCard style={styles.card} onPress={data.debts ? openDebtors : undefined}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Fee payment standing</Text>
          {data.debts && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
        </View>
        {haveStanding && totalStudents > 0 ? (
          <View style={styles.donutRow}>
            <DonutChart segments={standingSegments} size={140} thickness={16}>
              <Text style={[styles.donutValue, { color: colors.textPrimary }]}>
                {percent(standing.fullyPaid, totalStudents)}%
              </Text>
              <Text style={[styles.donutLabel, { color: colors.textMuted }]}>fully paid</Text>
            </DonutChart>
            <View style={styles.legend}>
              {standingSegments.map((s) => (
                <View key={s.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{s.label}</Text>
                    <Text style={[styles.legendValue, { color: colors.textPrimary }]}>
                      {s.value} <Text style={{ color: colors.textMuted, fontWeight: '500' }}>
                        ({percent(s.value, totalStudents)}%)
                      </Text>
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Text style={[styles.muted, { color: colors.textMuted }]}>
            {haveStanding
              ? 'No students enrolled yet.'
              : `Unavailable: ${failed.debts ?? failed.students ?? failed.bills}`}
          </Text>
        )}
      </AppCard>

      {/* Money */}
      <Text style={[styles.section, { color: colors.textPrimary }]}>School finances</Text>
      <View style={styles.row}>
        <MetricTile
          label="Collected this month"
          value={data.payments ? formatGHS(collectedThisMonth) : '—'}
          icon="trending-up-outline"
          tone="success"
          caption={data.payments ? `${data.payments.filter((p) => p.status === 'completed').length} payments` : undefined}
          onPress={openPayments}
        />
        <MetricTile
          label="Outstanding"
          value={data.debts ? formatGHS(outstanding) : '—'}
          icon="hourglass-outline"
          tone="error"
          caption={data.debts ? `across ${debtors.length} students` : 'unavailable'}
          onPress={data.debts ? openDebtors : undefined}
        />
      </View>
      <View style={styles.row}>
        <MetricTile
          label="Collection rate"
          value={haveStanding && totalBilled > 0 ? `${collectionRate}%` : '—'}
          icon="pie-chart-outline"
          caption={haveStanding && totalBilled > 0 ? `of ${formatGHS(totalBilled)} billed` : undefined}
        />
        <MetricTile
          label="Pending online"
          value={data.payments ? String(pendingThisMonth.length) : '—'}
          icon="time-outline"
          tone="warning"
          caption={data.payments ? formatGHS(pendingThisMonth.reduce((s, p) => s + toNumber(p.amount), 0)) : undefined}
        />
      </View>

      {/* Outstanding by bill */}
      {topBills.length > 0 && (
        <AppCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Outstanding by bill</Text>
          {topBills.map((b) => (
            <View key={b.billId} style={styles.barItem}>
              <View style={styles.barLabelRow}>
                <Text style={[styles.barLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                  {b.label}
                </Text>
                <Text style={[styles.barValue, { color: colors.textPrimary }]}>{formatGHS(b.owing)}</Text>
              </View>
              <View style={[styles.barTrack, { backgroundColor: colors.surfaceVariant }]}>
                <View
                  style={[
                    styles.barFill,
                    { backgroundColor: colors.error, width: `${(b.owing / topBills[0].owing) * 100}%` },
                  ]}
                />
              </View>
            </View>
          ))}
        </AppCard>
      )}

      {/* Recent payments */}
      <AppCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Recent payments</Text>
          <TouchableOpacity onPress={openPayments} hitSlop={8}>
            <Text style={[styles.link, { color: colors.primary }]}>See all</Text>
          </TouchableOpacity>
        </View>
        {recent.length === 0 ? (
          <Text style={[styles.muted, { color: colors.textMuted }]}>
            {data.payments ? 'No payments this month yet.' : `Unavailable: ${failed.payments}`}
          </Text>
        ) : (
          recent.map((p, i) => (
            <TouchableOpacity
              key={p.txn_id}
              onPress={() => navigation.navigate('Receipt', { payment: p, studentId: p.student_id ?? p.admission_no })}
              style={[styles.recentRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.recentTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {payerLabel(p)}
                </Text>
                <Text style={[styles.recentMeta, { color: colors.textMuted }]} numberOfLines={1}>
                  {billLabel(billMap, p.bill_id)} • {formatShortDate(p.created_at, true)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={[styles.recentAmount, { color: colors.textPrimary }]}>{formatGHS(p.amount)}</Text>
                <StatusPill status={p.status} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </AppCard>

      {/* Enrollment by grade (admin & principal) */}
      {!isBursar && gradeCounts.length > 0 && (
        <AppCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Enrollment by grade</Text>
          {gradeCounts.map(([grade, n]) => (
            <View key={grade} style={styles.gradeRow}>
              <Text style={[styles.gradeLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                {gradeLabel(grade)}
              </Text>
              <View style={[styles.barTrack, styles.gradeTrack, { backgroundColor: colors.surfaceVariant }]}>
                <View style={[styles.barFill, { backgroundColor: colors.primary, width: `${(n / maxGradeCount) * 100}%` }]} />
              </View>
              <Text style={[styles.gradeCount, { color: colors.textPrimary }]}>{n}</Text>
            </View>
          ))}
        </AppCard>
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  section: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 10,
  },
  card: {
    padding: 16,
    marginVertical: 0,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  link: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },
  muted: {
    fontSize: 13,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  donutValue: {
    fontSize: 26,
    fontWeight: '800',
  },
  donutLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  legend: {
    flex: 1,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
  },
  legendValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  barItem: {
    marginBottom: 10,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  barLabel: {
    flex: 1,
    fontSize: 12,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  recentMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  recentAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  gradeLabel: {
    width: 90,
    fontSize: 12,
  },
  gradeTrack: {
    flex: 1,
  },
  gradeCount: {
    width: 28,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
  },
});
