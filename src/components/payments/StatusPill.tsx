import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { PaymentStatus } from '../../api/types';

export interface StatusPillProps {
  status: PaymentStatus;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status }) => {
  const { colors, borderRadius, spacing } = useAppTheme();

  const getStyle = () => {
    switch (status) {
      case 'completed':
        return {
          bg: colors.successContainer,
          text: colors.success,
          label: 'Completed',
        };
      case 'pending':
        return {
          bg: colors.pendingContainer,
          text: colors.pending,
          label: 'Pending',
        };
      case 'failed':
        return {
          bg: colors.errorContainer,
          text: colors.error,
          label: 'Failed',
        };
    }
  };

  const { bg, text, label } = getStyle();

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: bg,
          borderRadius: borderRadius.full,
          paddingHorizontal: spacing.sm + 2,
          paddingVertical: 2,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: text }]} />
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
});
