import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';

export interface RangeOption<K extends string> {
  key: K;
  label: string;
}

export interface RangeSelectorProps<K extends string> {
  options: RangeOption<K>[];
  value: K;
  onChange: (key: K) => void;
}

/** Horizontally scrolling pill selector, so long option lists never squash on narrow phones. */
export function RangeSelector<K extends string>({ options, value, onChange }: RangeSelectorProps<K>) {
  const { colors } = useAppTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <TouchableOpacity
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.pill,
              {
                backgroundColor: active ? colors.primary : colors.surfaceVariant,
              },
            ]}
          >
            <Text style={[styles.text, { color: active ? colors.textInverse : colors.textPrimary }]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 6,
    paddingBottom: 2,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});
