import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';

export interface AppCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'subtle';
}

export const AppCard: React.FC<AppCardProps> = ({
  children,
  style,
  onPress,
  variant = 'elevated',
}) => {
  const { colors, borderRadius, spacing, shadows } = useAppTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case 'subtle':
        return colors.surfaceVariant;
      case 'elevated':
      case 'outlined':
      default:
        return colors.surface;
    }
  };

  const getShadow = () => {
    if (variant === 'elevated') {
      return shadows.card;
    }
    return {};
  };

  const cardStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: variant === 'outlined' ? colors.border : colors.border,
    ...getShadow(),
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[styles.card, cardStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.card, cardStyle, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
  },
});
