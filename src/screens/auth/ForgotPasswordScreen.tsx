import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useAppTheme } from '../../contexts/ThemeContext';
import { KEYBOARD_BOTTOM_OFFSET } from '../../constants/keyboard';
import { api } from '../../api/client';
import { AppTextInput } from '../../components/common/AppTextInput';
import { AppButton } from '../../components/common/AppButton';
import { ErrorBanner } from '../../components/common/ErrorBanner';

type Step = 'email' | 'reset';

const CODE_LENGTH = 8;

/**
 * Two steps against the backend: POST /auth/forgot-password emails a code,
 * then POST /auth/reset-password sets the new password with that code.
 */
export const ForgotPasswordScreen = ({ navigation, route }: any) => {
  const { colors } = useAppTheme();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState<string>(route.params?.email ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sendCode = async () => {
    if (!email.trim()) {
      setError('Please enter the email address on your account');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await api.forgotPassword(email.trim());
      setNotice(`If an account exists for ${email.trim()}, a ${CODE_LENGTH}-digit code has been sent to it. It expires in 15 minutes.`);
      setStep('reset');
    } catch (err: any) {
      setError(err.message || 'Could not send the reset code');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code.trim())) {
      setError(`Enter the ${CODE_LENGTH}-digit code from the email`);
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await api.resetPassword({ email: email.trim(), code: code.trim(), new_password: newPassword });
      Alert.alert('Password Reset', 'Your password has been changed. Sign in with your new password.', [
        { text: 'Sign In', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err: any) {
      setError(err.message || 'Could not reset your password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      bottomOffset={KEYBOARD_BOTTOM_OFFSET}
      keyboardShouldPersistTaps="handled"
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scroll}
    >
      <View style={styles.header}>
        <View style={[styles.logoIcon, { backgroundColor: colors.primaryContainer }]}>
          <Text style={{ fontSize: 32 }}>🔑</Text>
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {step === 'email' ? 'Forgot Password' : 'Set a New Password'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {step === 'email'
            ? "Enter your account email and we'll send you a reset code"
            : 'Enter the code from your email and choose a new password'}
        </Text>
      </View>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {step === 'reset' && notice && (
        <View style={[styles.noticeBox, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
          <Text style={[styles.noticeText, { color: colors.textSecondary }]}>{notice}</Text>
        </View>
      )}

      <View style={styles.form}>
        <AppTextInput
          label="Email Address"
          placeholder="e.g. mum@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={step === 'email'}
        />

        {step === 'email' ? (
          <AppButton title="Send Reset Code" onPress={sendCode} loading={loading} style={styles.primaryBtn} />
        ) : (
          <>
            <AppTextInput
              label="Reset Code"
              placeholder={`${CODE_LENGTH}-digit code`}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, CODE_LENGTH))}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={CODE_LENGTH}
            />
            <AppTextInput
              label="New Password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <AppTextInput
              label="Confirm New Password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <AppButton title="Reset Password" onPress={resetPassword} loading={loading} style={styles.primaryBtn} />

            <View style={styles.row}>
              <TouchableOpacity onPress={sendCode} disabled={loading}>
                <Text style={[styles.link, { color: colors.primary }]}>Resend code</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setStep('email');
                  setCode('');
                  setError(null);
                }}
                disabled={loading}
              >
                <Text style={[styles.link, { color: colors.primary }]}>Use a different email</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  noticeBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
  },
  form: {
    marginTop: 8,
  },
  primaryBtn: {
    marginTop: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  link: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
});
