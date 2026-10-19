import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import { formatGHS } from '../../utils/currency';
import { groupDebtsByStudent, StudentDebtSummary } from '../../utils/finance';
import { GRADE_OPTIONS } from '../../constants/grades';
import { AppCard } from '../../components/common/AppCard';
import { AppTextInput } from '../../components/common/AppTextInput';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { RangeSelector } from '../../components/finance/RangeSelector';

type SortKey = 'owing' | 'name' | 'grade';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'owing', label: 'Highest owed' },
  { key: 'name', label: 'Name' },
  { key: 'grade', label: 'Grade' },
];

const GRADE_ORDER = GRADE_OPTIONS.map((g) => g.value);
const gradeRank = (g: string) => (GRADE_ORDER.indexOf(g) + 1) || 999;
const gradeLabel = (g: string) =>
  GRADE_OPTIONS.find((o) => o.value === g)?.label.replace(/\s*\(.*\)$/, '') ?? g;

/** Every student who still owes, with a per-bill breakdown and totals. Shared by admin, principal and bursar. */
export const DebtorsScreen = () => {
  const { colors } = useAppTheme();

  const [debtors, setDebtors] = useState<StudentDebtSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [grade, setGrade] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('owing');

  const load = useCallback(async () => {
    try {
      const debts = await api.getStudentDebts();
      setDebtors(groupDebtsByStudent(debts));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load students owing fees');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const gradeOptions = useMemo(() => {
    const present = Array.from(new Set(debtors.map((d) => d.grade))).sort((a, b) => gradeRank(a) - gradeRank(b));
    return [{ key: 'all', label: 'All grades' }, ...present.map((g) => ({ key: g, label: gradeLabel(g) }))];
  }, [debtors]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = debtors.filter(
      (d) =>
        (grade === 'all' || d.grade === grade) &&
        (!q || d.name.toLowerCase().includes(q) || d.studentId?.toLowerCase().includes(q))
    );
    return filtered.sort((a, b) => {
      if (sort === 'owing') return b.totalOwing - a.totalOwing;
      if (sort === 'grade') return gradeRank(a.grade) - gradeRank(b.grade) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
  }, [debtors, query, grade, sort]);

  const totals = useMemo(
    () =>
      visible.reduce(
        (t, d) => ({ price: t.price + d.totalPrice, paid: t.paid + d.totalPaid, owing: t.owing + d.totalOwing }),
        { price: 0, paid: 0, owing: 0 }
      ),
    [visible]
  );

  if (loading) return <LoadingSpinner message="Loading debtors..." />;

  const cell = (text: string, style: object, color: string, bold = false) => (
    <Text style={[styles.cell, style, { color, fontWeight: bold ? '700' : '400' }]} numberOfLines={1}>
      {text}
    </Text>
  );

  const renderStudent = ({ item }: { item: StudentDebtSummary }) => (
    <AppCard style={styles.card}>
      <View style={styles.studentHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.studentName, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.studentMeta, { color: colors.textMuted }]}>
            {gradeLabel(item.grade)}
            {item.studentId ? ` • ${item.studentId}` : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.owingLabel, { color: colors.textMuted }]}>Owes</Text>
          <Text style={[styles.owingValue, { color: colors.error }]}>{formatGHS(item.totalOwing)}</Text>
        </View>
      </View>

      <View style={[styles.table, { borderColor: colors.border }]}>
        <View style={[styles.tr, { backgroundColor: colors.surfaceVariant }]}>
          {cell('Bill', styles.colBill, colors.textSecondary, true)}
          {cell('Price', styles.colNum, colors.textSecondary, true)}
          {cell('Paid', styles.colNum, colors.textSecondary, true)}
          {cell('Owing', styles.colNum, colors.textSecondary, true)}
        </View>
        {item.lines.map((l) => (
          <View key={l.billId} style={[styles.tr, { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <View style={styles.colBill}>
              <Text style={[styles.cell, { color: colors.textPrimary }]} numberOfLines={1}>
                {l.billName}
              </Text>
              <Text style={[styles.sem, { color: colors.textMuted }]} numberOfLines={1}>
                {l.sem}
              </Text>
            </View>
            {cell(l.price.toFixed(2), styles.colNum, colors.textSecondary)}
            {cell(l.paid.toFixed(2), styles.colNum, colors.success)}
            {cell(l.owing.toFixed(2), styles.colNum, colors.error, true)}
          </View>
        ))}
        {item.lines.length > 1 && (
          <View style={[styles.tr, { borderTopColor: colors.border, borderTopWidth: 1 }]}>
            {cell('Total', styles.colBill, colors.textPrimary, true)}
            {cell(item.totalPrice.toFixed(2), styles.colNum, colors.textPrimary, true)}
            {cell(item.totalPaid.toFixed(2), styles.colNum, colors.success, true)}
            {cell(item.totalOwing.toFixed(2), styles.colNum, colors.error, true)}
          </View>
        )}
      </View>
    </AppCard>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <FlatList
        data={visible}
        keyExtractor={(d) => d.key}
        renderItem={renderStudent}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
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
        ListHeaderComponent={
          <View>
            <AppCard style={styles.summary}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{visible.length}</Text>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                  Student{visible.length === 1 ? '' : 's'} owing
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.error }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatGHS(totals.owing)}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total owed</Text>
              </View>
            </AppCard>

            <AppTextInput
              placeholder="Search by name or student ID"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="none"
              leftIcon={<Ionicons name="search-outline" size={18} color={colors.textMuted} />}
              containerStyle={styles.search}
            />
            <View style={styles.filters}>
              <RangeSelector options={gradeOptions} value={grade} onChange={setGrade} />
            </View>
            <View style={styles.filters}>
              <RangeSelector options={SORTS} value={sort} onChange={setSort} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-circle-outline" size={40} color={colors.success} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {debtors.length === 0 ? 'Every student is fully paid up.' : 'No students match your filters.'}
            </Text>
          </View>
        }
        ListFooterComponent={
          visible.length > 0 ? (
            <AppCard style={styles.footer} variant="subtle">
              <Text style={[styles.footerTitle, { color: colors.textPrimary }]}>
                Grand total ({visible.length} student{visible.length === 1 ? '' : 's'})
              </Text>
              <View style={styles.footerRow}>
                <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Billed</Text>
                <Text style={[styles.footerValue, { color: colors.textPrimary }]}>{formatGHS(totals.price)}</Text>
              </View>
              <View style={styles.footerRow}>
                <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Paid</Text>
                <Text style={[styles.footerValue, { color: colors.success }]}>{formatGHS(totals.paid)}</Text>
              </View>
              <View style={styles.footerRow}>
                <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Owing</Text>
                <Text style={[styles.footerValue, { color: colors.error }]}>{formatGHS(totals.owing)}</Text>
              </View>
            </AppCard>
          ) : null
        }
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
    paddingBottom: 32,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginTop: 0,
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginHorizontal: 8,
  },
  search: {
    marginBottom: 10,
  },
  filters: {
    marginBottom: 8,
  },
  card: {
    padding: 14,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
  },
  studentMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  owingLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  owingValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  table: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6,
  },
  cell: {
    fontSize: 12,
  },
  sem: {
    fontSize: 10,
    marginTop: 1,
  },
  colBill: {
    flex: 1.6,
  },
  colNum: {
    flex: 1,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  empty: {
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    marginTop: 8,
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  footerLabel: {
    fontSize: 13,
  },
  footerValue: {
    fontSize: 14,
    fontWeight: '700',
  },
});
