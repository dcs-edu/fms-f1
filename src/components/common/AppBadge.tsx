import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { UserRole } from '../../api/types';

export interface AppBadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
  role?: UserRole;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const AppBadge: React.FC<AppBadgeProps> = ({
  label,
  variant = 'primary',
  role,
  size = 'md',
  style,
}) => {
  const { colors, borderRadius, spacing } = useAppTheme();

  const getRoleColors = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return { bg: colors.primaryDark, text: '#FFFFFF' };
      case 'principal':
        return { bg: colors.primary, text: '#FFFFFF' };
      case 'bursar':
        return { bg: colors.currencyBadge, text: colors.currencyText };
      case 'teacher':
        return { bg: colors.chipBackground, text: colors.chipText };
      case 'parent':
        return { bg: colors.surfaceVariant, text: colors.textSecondary };
    }
  };

  const getVariantColors = () => {
    if (role) return getRoleColors(role);
    switch (variant) {
      case 'success':
        return { bg: colors.successContainer, text: colors.success };
      case 'warning':
        return { bg: colors.warningContainer, text: colors.warning };
      case 'error':
        return { bg: colors.errorContainer, text: colors.error };
      case 'neutral':
        return { bg: colors.surfaceVariant, text: colors.textSecondary };
      case 'primary':
      default:
        return { bg: colors.primaryContainer, text: colors.onPrimaryContainer };
    }
  };

  const { bg, text } = getVariantColors();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderRadius: borderRadius.full,
          paddingVertical: size === 'sm' ? 2 : spacing.xs,
          paddingHorizontal: size === 'sm' ? spacing.sm : spacing.md,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: text,
            fontSize: size === 'sm' ? 11 : 12,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
