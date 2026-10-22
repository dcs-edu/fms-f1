import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { AppCard } from '../../components/common/AppCard';
import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';

export const ProfileScreen = ({ navigation }: any) => {
  const { user, role, logout, apiBaseUrl } = useAuth();
  const { colors, mode, isDark, setThemeMode, spacing } = useAppTheme();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
          <Text style={[styles.avatarText, { color: colors.onPrimaryContainer }]}>
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={[styles.email, { color: colors.textPrimary }]}>{user?.email}</Text>
        <View style={styles.badgeWrapper}>
          {role && <AppBadge label={role} role={role} size="md" />}
        </View>
      </View>

      <AppCard style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account Details</Text>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Account ID</Text>
          <Text style={[styles.val, styles.mono, { color: colors.textPrimary }]} numberOfLines={1}>
            {user?.id}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Role</Text>
          <Text style={[styles.val, { color: colors.textPrimary, textTransform: 'capitalize' }]}>
            {role}
          </Text>
        </View>
        {role === 'admin' && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Server</Text>
            <Text style={[styles.val, styles.mono, { color: colors.textMuted }]} numberOfLines={1}>
              {apiBaseUrl}
            </Text>
          </View>
        )}
      </AppCard>

      <AppCard style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
        <View style={styles.themeOptions}>
          {(['system', 'light', 'dark'] as const).map((tMode) => (
            <TouchableOpacity
              key={tMode}
              onPress={() => setThemeMode(tMode)}
              style={[
                styles.themeBtn,
                {
                  backgroundColor: mode === tMode ? colors.primary : colors.surfaceVariant,
                },
              ]}
            >
              <Text
                style={{
                  color: mode === tMode ? '#FFFFFF' : colors.textPrimary,
                  fontWeight: '600',
                  fontSize: 13,
                  textTransform: 'capitalize',
                }}
              >
                {tMode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </AppCard>

      <View style={styles.buttonGroup}>
        <AppButton
          title="Change Password"
          variant="outline"
          onPress={() => navigation.navigate('ChangePassword')}
          style={{ marginBottom: spacing.md }}
        />
        <AppButton title="Sign Out" variant="danger" onPress={handleLogout} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
  },
  email: {
    fontSize: 18,
    fontWeight: '700',
  },
  badgeWrapper: {
    marginTop: 8,
  },
  section: {
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2ECE5',
  },
  label: {
    fontSize: 14,
  },
  val: {
    fontSize: 14,
    fontWeight: '600',
    maxWidth: '65%',
  },
  mono: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  themeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonGroup: {
    marginTop: 20,
    marginBottom: 30,
  },
});
