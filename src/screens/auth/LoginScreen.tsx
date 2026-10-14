import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { AppTextInput } from '../../components/common/AppTextInput';
import { AppButton } from '../../components/common/AppButton';
import { ErrorBanner } from '../../components/common/ErrorBanner';

export const LoginScreen = ({ navigation }: any) => {
  const { login, apiBaseUrl, setApiBaseUrl } = useAuth();
  const { colors, typography, spacing, isDark, toggleTheme } = useAppTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [customUrl, setCustomUrl] = useState(apiBaseUrl);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUrl = () => {
    setApiBaseUrl(customUrl);
    setShowConfig(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
              {isDark ? '☀️ Light' : '🌙 Dark'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowConfig(!showConfig)}>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
              ⚙️ Server URL
            </Text>
          </TouchableOpacity>
        </View>

        {showConfig && (
          <View style={[styles.configCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.configTitle, { color: colors.textPrimary }]}>
              Backend Server Connection
            </Text>
            <AppTextInput
              label="API Base URL"
              value={customUrl}
              onChangeText={setCustomUrl}
              autoCapitalize="none"
              hint="e.g. http://localhost:8080 or http://10.0.2.2:8080 (Android)"
            />
            <AppButton title="Update URL" size="sm" onPress={handleSaveUrl} />
          </View>
        )}

        <View style={styles.header}>
          <View style={[styles.logoIcon, { backgroundColor: colors.primaryContainer }]}>
            <Text style={{ fontSize: 32 }}>🏫</Text>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            School Fees & Portal
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in with your registered account
          </Text>
        </View>

        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        <View style={styles.form}>
          <AppTextInput
            label="Email Address"
            placeholder="e.g. mum@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <AppTextInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <AppButton
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginBtn}
          />

          <View style={styles.footer}>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
              Don't have an account yet?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>
                Register as Parent
              </Text>
            </TouchableOpacity>
          </View>
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
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  themeToggle: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  configCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  configTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
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
  form: {
    marginTop: 8,
  },
  loginBtn: {
    marginTop: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
});
