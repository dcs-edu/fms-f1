import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAppTheme } from '../../contexts/ThemeContext';

export interface PaystackWebViewModalProps {
  visible: boolean;
  authorizationUrl: string | null;
  reference: string;
  onSuccess: (reference: string) => void;
  onClose: () => void;
}

export const PaystackWebViewModal: React.FC<PaystackWebViewModalProps> = ({
  visible,
  authorizationUrl,
  reference,
  onSuccess,
  onClose,
}) => {
  const { colors } = useAppTheme();
  const [loading, setLoading] = useState(true);

  if (!visible || !authorizationUrl) {
    return null;
  }

  const handleNavigationStateChange = (state: { url: string }) => {
    const { url } = state;
    // Paystack redirects after payment (usually standard redirect or callback with trxref)
    if (
      url.includes('trxref=') ||
      url.includes('reference=') ||
      url.includes('/close') ||
      url.includes('callback')
    ) {
      // Payment attempt completed on Paystack, trigger verification
      onSuccess(reference);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Secure Paystack Checkout
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={[styles.closeText, { color: colors.textSecondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Connecting to Paystack...
            </Text>
          </View>
        )}

        <WebView
          source={{ uri: authorizationUrl }}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={handleNavigationStateChange}
          style={styles.webview}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loader: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  webview: {
    flex: 1,
  },
});
