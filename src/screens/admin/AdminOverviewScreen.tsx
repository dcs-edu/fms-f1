import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { AppCard } from '../../components/common/AppCard';
import { AppBadge } from '../../components/common/AppBadge';

export const AdminOverviewScreen = ({ navigation }: any) => {
  const { role, user } = useAuth();
  const { colors, typography } = useAppTheme();

  const isAdmin = role === 'admin';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {isAdmin ? 'Administrative Console' : 'Principal Hub'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Manage enrollments, cash collections, and school authorization
        </Text>
      </View>

      <AppCard style={styles.roleCard}>
        <View style={styles.roleHeader}>
          <View>
            <Text style={[styles.roleUser, { color: colors.textPrimary }]}>{user?.email}</Text>
            <Text style={[styles.roleLabel, { color: colors.textMuted }]}>
              Active Session Privilege Level
            </Text>
          </View>
          {role && <AppBadge label={role} role={role} size="md" />}
        </View>
      </AppCard>

      <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
        Quick Actions
      </Text>

      <View style={styles.grid}>
        <AppCard
          style={styles.actionCard}
          onPress={() => navigation.navigate('EnrollTab')}
        >
          <Text style={styles.actionIcon}>🎓</Text>
          <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
            Enroll Student
          </Text>
          <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
            Register student & calculate graduation card ID
          </Text>
        </AppCard>

        <AppCard
          style={styles.actionCard}
          onPress={() => navigation.navigate('CashPayTab')}
        >
          <Text style={styles.actionIcon}>💵</Text>
          <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
            Record Cash
          </Text>
          <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
            Official physical cash receipting with balance locking
          </Text>
        </AppCard>

        <AppCard
          style={styles.actionCard}
          onPress={() => navigation.navigate('LinkParentTab')}
        >
          <Text style={styles.actionIcon}>🔗</Text>
          <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
            Link Parent
          </Text>
          <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
            Connect parent account with student card ID
          </Text>
        </AppCard>

        {isAdmin && (
          <AppCard
            style={styles.actionCard}
            onPress={() => navigation.navigate('RolesTab')}
          >
            <Text style={styles.actionIcon}>👥</Text>
            <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
              User Roles
            </Text>
            <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
              Promote staff, assign bursar or principal roles
            </Text>
          </AppCard>
        )}
      </View>

      <AppCard style={styles.auditCard}>
        <Text style={[styles.auditTitle, { color: colors.primary }]}>
          🛡️ Internal Control & Traceability
        </Text>
        <Text style={[styles.auditText, { color: colors.textSecondary }]}>
          Every cash payment is stamped with your administrator user ID. Overpayment checks run directly in database transactions to prevent accounting discrepancies.
        </Text>
      </AppCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
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
    marginTop: 2,
    lineHeight: 18,
  },
  roleCard: {
    padding: 16,
    marginBottom: 20,
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleUser: {
    fontSize: 15,
    fontWeight: '700',
  },
  roleLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  grid: {
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    padding: 16,
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  auditCard: {
    padding: 16,
    marginBottom: 20,
  },
  auditTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  auditText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
