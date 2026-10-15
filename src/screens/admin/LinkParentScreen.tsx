import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import { isValidStudentID } from '../../utils/studentId';
import { AppTextInput } from '../../components/common/AppTextInput';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { ErrorBanner } from '../../components/common/ErrorBanner';

export const LinkParentScreen = () => {
  const { colors } = useAppTheme();

  const [parentEmail, setParentEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLink = async () => {
    if (!parentEmail.trim() || !studentId.trim()) {
      setError('Please provide both the parent email and the student card ID');
      return;
    }

    if (!isValidStudentID(studentId.trim())) {
      setError('Student ID must match YY-NNNN format (e.g. 30-0042)');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await api.linkParent({
        parent_email: parentEmail.trim(),
        student_id: studentId.trim(),
      });

      Alert.alert(
        'Success!',
        `Account ${parentEmail} is now linked to student ${studentId}. The parent can now see the child in their dashboard and pay fees online.`
      );

      setParentEmail('');
      setStudentId('');
    } catch (err: any) {
      setError(err.message || 'Failed to link parent to student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Link Parent to Student
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Staff verification: authorize a parent account to access a student's billing records
          </Text>
        </View>

        <AppCard style={styles.infoCard}>
          <Text style={[styles.infoTitle, { color: colors.primary }]}>
            🛡️ Security Verification
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            To protect student privacy and prevent unauthorized access, parents cannot link children themselves. Only school staff can confirm relationships and issue links.
          </Text>
        </AppCard>

        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        <View style={styles.form}>
          <AppTextInput
            label="Parent Email Address"
            placeholder="e.g. ama.parent@example.com"
            value={parentEmail}
            onChangeText={setParentEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            hint="Account must already be registered as a parent"
          />

          <AppTextInput
            label="Student Card ID"
            placeholder="e.g. 30-0042"
            value={studentId}
            onChangeText={setStudentId}
            autoCapitalize="characters"
            hint="Student ID printed on their card (YY-NNNN)"
          />

          <AppButton
            title="Confirm & Link Account"
            variant="primary"
            size="lg"
            loading={loading}
            onPress={handleLink}
            style={{ marginTop: 12 }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
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
  infoCard: {
    padding: 14,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 16,
  },
  form: {
    marginTop: 4,
  },
});
