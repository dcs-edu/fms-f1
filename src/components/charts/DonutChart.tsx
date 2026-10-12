import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useAppTheme } from '../../contexts/ThemeContext';

export interface DonutSegment {
  value: number;
  color: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  /** Rendered in the hole of the ring, e.g. a headline percentage. */
  children?: React.ReactNode;
}

/** Gap between segments, in degrees, so adjacent colours stay distinguishable. */
const GAP_DEGREES = 2;

export const DonutChart: React.FC<DonutChartProps> = ({
  segments,
  size = 160,
  thickness = 18,
  children,
}) => {
  const { colors } = useAppTheme();
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const visible = segments.filter((s) => s.value > 0);
  const total = visible.reduce((sum, s) => sum + s.value, 0);
  const gap = visible.length > 1 ? (GAP_DEGREES / 360) * circumference : 0;

  // each arc starts where the previous ones end
  const starts = visible.map((_, i) =>
    visible.slice(0, i).reduce((sum, s) => sum + (s.value / total) * circumference, 0)
  );
  const arcs = visible.map((s, i) => {
    const length = (s.value / total) * circumference;
    return (
      <Circle
        key={i}
        cx={center}
        cy={center}
        r={radius}
        stroke={s.color}
        strokeWidth={thickness}
        fill="none"
        strokeDasharray={`${Math.max(length - gap, 0)} ${circumference}`}
        strokeDashoffset={-starts[i]}
      />
    );
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.surfaceVariant}
          strokeWidth={thickness}
          fill="none"
        />
        {/* start at 12 o'clock and run clockwise */}
        <G rotation={-90} origin={`${center}, ${center}`}>
          {arcs}
        </G>
      </Svg>
      {children && <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
