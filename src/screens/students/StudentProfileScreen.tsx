import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image } from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import { Std, Student, StudentBill } from '../../api/types';
import { formatGHS } from '../../utils/currency';
import { formatShortDate, fullName, groupBillsBySemester, totalRemaining, toNumber } from '../../utils/finance';
import { gradeLabel } from '../../constants/grades';
import { AppCard } from '../../components/common/AppCard';
import { AppButton } from '../../components/common/AppButton';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { BillLineItem } from '../../components/payments/BillLineItem';

const GENDERS: Record<string, string> = { M: 'Male', F: 'Female' };

/** Full profile of one student (GET /students/profile) with their fees, opened from the students list. */
export const StudentProfileScreen = ({ route }: any) => {
  const { student: summary } = route.params as { student: Std };
  const { colors } = useAppTheme();

  const [profile, setProfile] = useState<Student | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [bills, setBills] = useState<StudentBill[] | null>(null);
  const [billsError, setBillsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // profile and bills load independently, so one failing still shows the other
  const load = useCallback(async () => {
    const [p, b] = await Promise.allSettled([
      api.getStudentProfile(summary.student_id),
      api.getStudentBills(summary.student_id),
    ]);
    if (p.status === 'fulfilled') {
      setProfile(p.value);
      setProfileError(null);
    } else {
      setProfileError(p.reason?.message || 'Failed to load profile');
    }
    if (b.status === 'fulfilled') {
      setBills(b.value.bills);
      setBillsError(null);
    } else {
      setBillsError(b.reason?.message || 'Failed to load bills');
    }
    setLoading(false);
    setRefreshing(false);
  }, [summary.student_id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const semesters = useMemo(() => groupBillsBySemester(bills ?? []), [bills]);
  const outstanding = totalRemaining(bills ?? []);
  const totalBilled = (bills ?? []).reduce((s, b) => s + toNumber(b.amount), 0);

  if (loading) return <LoadingSpinner message="Loading profile..." />;

  const name = profile ? fullName({ fname: profile.fname, mname: profile.mname, lname: profile.lname }) : fullName(summary);
  const studentId = profile?.student_id ?? summary.student_id;
  const grade = profile?.grade ?? summary.grade;
  const photo = profile?.photo && /^(https?:|data:image\/)/.test(profile.photo) ? profile.photo : null;

  const field = (label: string, value?: string | null) => (
    <View key={label} style={[styles.field, { borderTopColor: colors.border }]}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>{value?.trim() || '—'}</Text>
    </View>
  );

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
      <AppCard style={styles.headerCard}>
        <View style={styles.headerRow}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.initialsWrap, { backgroundColor: colors.primaryContainer }]}>
              <Text style={[styles.initials, { color: colors.primary }]}>
                {(summary.fname[0] ?? '') + (summary.lname[0] ?? '')}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.textPrimary }]}>{name}</Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              {studentId} • {gradeLabel(grade)}
            </Text>
          </View>
        </View>

        {bills && (
          <View style={styles.balanceRow}>
            <View style={[styles.balanceBox, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Total Billed</Text>
              <Text style={[styles.balanceValue, { color: colors.textPrimary }]}>{formatGHS(totalBilled)}</Text>
            </View>
            <View
              style={[
                styles.balanceBox,
                { backgroundColor: outstanding > 0 ? colors.errorContainer : colors.successContainer },
              ]}
            >
              <Text style={[styles.balanceLabel, { color: outstanding > 0 ? colors.error : colors.success }]}>
                Outstanding
              </Text>
              <Text style={[styles.balanceValue, { color: outstanding > 0 ? colors.error : colors.success }]}>
                {formatGHS(outstanding)}
              </Text>
            </View>
          </View>
        )}
      </AppCard>

      {profileError ? (
        <AppCard style={styles.card} variant="outlined">
          <Text style={[styles.errorText, { color: colors.error }]}>{profileError}</Text>
          <AppButton title="Retry" variant="outline" size="sm" onPress={load} style={{ marginTop: 10 }} />
        </AppCard>
      ) : (
        profile && (
          <>
            <AppCard style={styles.card}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Personal</Text>
              {field('Date of birth', profile.dob ? formatShortDate(profile.dob) : null)}
              {field('Gender', GENDERS[profile.gender] ?? profile.gender)}
              {field('Nationality', profile.nationality)}
              {field('Address', profile.address)}
              {field('Enrolled', profile.created_at ? formatShortDate(profile.created_at) : null)}
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Guardian</Text>
              {field('Name', profile.guardian)}
              {field('Contact', profile.g_contact)}
              {field('Occupation', profile.g_occupation)}
              {field('Emergency contact', profile.e_contact)}
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Health</Text>
              {field('Medical conditions', profile.med_con)}
              {field('Allergies', profile.allergies)}
            </AppCard>
          </>
        )
      )}

      <Text style={[styles.section, { color: colors.textPrimary }]}>Fees & Bills</Text>
      {billsError ? (
        <Text style={[styles.muted, { color: colors.error }]}>{billsError}</Text>
      ) : semesters.length === 0 ? (
        <Text style={[styles.muted, { color: colors.textMuted }]}>No bills have been published yet.</Text>
      ) : (
        semesters.map((s) => (
          <View key={s.sem} style={styles.semBlock}>
            <Text style={[styles.semTitle, { color: colors.textPrimary }]}>{s.sem}</Text>
            <Text style={[styles.semMeta, { color: colors.textMuted }]}>
              {formatGHS(s.totalPaid)} of {formatGHS(s.totalPrice)} paid
              {s.totalRemaining > 0 ? ` • ${formatGHS(s.totalRemaining)} owing` : ''}
            </Text>
            {s.bills.map((b) => (
              <BillLineItem key={b.bill_id} bill={b} />
            ))}
          </View>
        ))
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
  headerCard: {
    padding: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  initialsWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 18,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 19,
    fontWeight: '800',
  },
  meta: {
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
  balanceLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  balanceValue: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  card: {
    padding: 16,
    marginVertical: 0,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fieldLabel: {
    fontSize: 13,
  },
  fieldValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  errorText: {
    fontSize: 13,
  },
  section: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 10,
  },
  muted: {
    fontSize: 13,
  },
  semBlock: {
    marginBottom: 8,
  },
  semTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  semMeta: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
  },
});
