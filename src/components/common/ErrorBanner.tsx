import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';

export interface ErrorBannerProps {
  message: string | null;
  onDismiss?: () => void;
  type?: 'error' | 'warning' | 'info';
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onDismiss,
  type = 'error',
}) => {
  const { colors, borderRadius, spacing } = useAppTheme();

  if (!message) return null;

  const getColors = () => {
    switch (type) {
      case 'warning':
        return {
          bg: colors.warningContainer,
          border: colors.warning,
          text: colors.warning,
        };
      case 'info':
        return {
          bg: colors.primaryContainer,
          border: colors.primary,
          text: colors.primary,
        };
      case 'error':
      default:
        return {
          bg: colors.errorContainer,
          border: colors.error,
          text: colors.error,
        };
    }
  };

  const { bg, border, text } = getColors();

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: bg,
          borderColor: border,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          marginBottom: spacing.md,
        },
      ]}
    >
      <Text style={[styles.text, { color: text }]}>{message}</Text>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
          <Text style={[styles.dismissText, { color: text }]}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  dismissBtn: {
    paddingLeft: 10,
    paddingVertical: 4,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
