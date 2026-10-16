import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import { Std } from '../../api/types';
import { fullName } from '../../utils/finance';
import { gradeLabel, gradeRank } from '../../constants/grades';
import { AppCard } from '../../components/common/AppCard';
import { AppTextInput } from '../../components/common/AppTextInput';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { RangeSelector } from '../../components/finance/RangeSelector';

/** Every enrolled student, searchable by name or student ID. Tap one for the full profile. */
export const StudentsScreen = ({ navigation }: any) => {
  const { colors } = useAppTheme();

  const [students, setStudents] = useState<Std[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [grade, setGrade] = useState<string>('all');

  const load = useCallback(async () => {
    try {
      setStudents(await api.getStudents());
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load students');
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
    const present = Array.from(new Set(students.map((s) => s.grade))).sort((a, b) => gradeRank(a) - gradeRank(b));
    return [{ key: 'all', label: 'All grades' }, ...present.map((g) => ({ key: g, label: gradeLabel(g) }))];
  }, [students]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter(
      (s) =>
        (grade === 'all' || s.grade === grade) &&
        (!q || fullName(s).toLowerCase().includes(q) || s.student_id.toLowerCase().includes(q))
    );
  }, [students, query, grade]);

  if (loading) return <LoadingSpinner message="Loading students..." />;

  const renderStudent = ({ item }: { item: Std }) => (
    <AppCard style={styles.card} onPress={() => navigation.navigate('StudentProfile', { student: item })}>
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
          <Text style={[styles.initials, { color: colors.primary }]}>
            {(item.fname[0] ?? '') + (item.lname[0] ?? '')}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {fullName(item)}
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {item.student_id} • {gradeLabel(item.grade)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </AppCard>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <FlatList
        data={visible}
        keyExtractor={(s) => s.student_id}
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
            <Text style={[styles.count, { color: colors.textMuted }]}>
              {visible.length} of {students.length} student{students.length === 1 ? '' : 's'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {students.length === 0 ? 'No students enrolled yet.' : 'No students match your search.'}
            </Text>
          </View>
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
  search: {
    marginBottom: 8,
  },
  filters: {
    marginBottom: 10,
  },
  count: {
    fontSize: 12,
    marginBottom: 8,
  },
  card: {
    padding: 12,
    marginVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
});
