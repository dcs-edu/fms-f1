import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../contexts/ThemeContext';
import { AppCard } from '../common/AppCard';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface MetricTileProps {
  label: string;
  value: string;
  icon: IconName;
  tone?: 'primary' | 'success' | 'warning' | 'error';
  caption?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export const MetricTile: React.FC<MetricTileProps> = ({
  label,
  value,
  icon,
  tone = 'primary',
  caption,
  onPress,
  style,
}) => {
  const { colors } = useAppTheme();
  const toneColors = {
    primary: { fg: colors.primary, bg: colors.primaryContainer },
    success: { fg: colors.success, bg: colors.successContainer },
    warning: { fg: colors.warning, bg: colors.warningContainer },
    error: { fg: colors.error, bg: colors.errorContainer },
  }[tone];

  return (
    <AppCard style={{ ...styles.tile, ...style }} onPress={onPress}>
      <View style={styles.top}>
        <View style={[styles.iconWrap, { backgroundColor: toneColors.bg }]}>
          <Ionicons name={icon} size={16} color={toneColors.fg} />
        </View>
        {onPress && <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />}
      </View>
      <Text style={[styles.value, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
      {caption ? (
        <Text style={[styles.caption, { color: colors.textMuted }]} numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </AppCard>
  );
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    padding: 14,
    marginVertical: 0,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  caption: {
    fontSize: 11,
    marginTop: 2,
  },
});
