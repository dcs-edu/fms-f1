import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import { Std } from '../../api/types';
import { formatGHS } from '../../utils/currency';
import { totalRemaining } from '../../utils/finance';
import { AppCard } from '../../components/common/AppCard';
import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const ChildrenScreen = ({ navigation }: any) => {
  const { colors, typography, spacing } = useAppTheme();
  const [children, setChildren] = useState<Std[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Outstanding balance per student_id; missing while loading or if that child's bills failed to load
  const [owing, setOwing] = useState<Record<string, number>>({});

  const fetchChildren = useCallback(async () => {
    try {
      setError(null);
      const data = (await api.getMyChildren()) || [];
      setChildren(data);

      const results = await Promise.allSettled(data.map((c) => api.getStudentBills(c.student_id)));
      const next: Record<string, number> = {};
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') next[data[i].student_id] = totalRemaining(r.value.bills);
      });
      setOwing(next);
    } catch (err: any) {
      setError(err.message || 'Failed to load children records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchChildren();
  };

  if (loading) {
    return <LoadingSpinner message="Loading your children's profiles..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <FlatList
        data={children}
        keyExtractor={(item) => item.student_id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>My Children</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Official records linked to your account by the school administration
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>👨‍👧‍👦</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No Children Linked Yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Please contact the school principal or administration to link your parent account to your child's student ID.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <AppCard style={styles.childCard}>
            <View style={styles.childHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
                <Text style={[styles.avatarText, { color: colors.onPrimaryContainer }]}>
                  {item.fname.charAt(0)}{item.lname.charAt(0)}
                </Text>
              </View>
              <View style={styles.nameContainer}>
                <Text style={[styles.childName, { color: colors.textPrimary }]}>
                  {item.fname} {item.mname ? `${item.mname} ` : ''}{item.lname}
                </Text>
                <Text style={[styles.studentId, { color: colors.textMuted }]}>
                  Card ID: <Text style={{ fontFamily: 'monospace', fontWeight: '700' }}>{item.student_id}</Text>
                </Text>
              </View>
              <AppBadge label={`Grade ${item.grade}`} variant="primary" size="sm" />
            </View>

            {owing[item.student_id] !== undefined && (
              <View
                style={[
                  styles.owingBox,
                  { backgroundColor: owing[item.student_id] > 0 ? colors.errorContainer : colors.successContainer },
                ]}
              >
                <Text style={[styles.owingLabel, { color: owing[item.student_id] > 0 ? colors.error : colors.success }]}>
                  {owing[item.student_id] > 0 ? 'Outstanding balance' : 'All bills paid'}
                </Text>
                {owing[item.student_id] > 0 && (
                  <Text style={[styles.owingValue, { color: colors.error }]}>{formatGHS(owing[item.student_id])}</Text>
                )}
              </View>
            )}

            <View style={styles.cardActions}>
              <AppButton
                title="View History & Bills"
                variant="outline"
                size="sm"
                onPress={() => navigation.navigate('ChildDetail', { student: item })}
                style={styles.actionBtn}
              />
              <AppButton
                title="Pay Fees Online"
                variant="primary"
                size="sm"
                onPress={() => navigation.navigate('PayBill', { student: item })}
                style={styles.actionBtn}
              />
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
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  childCard: {
    padding: 16,
    marginVertical: 8,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  nameContainer: {
    flex: 1,
  },
  childName: {
    fontSize: 16,
    fontWeight: '700',
  },
  studentId: {
    fontSize: 12,
    marginTop: 2,
  },
  owingBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  owingLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  owingValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
