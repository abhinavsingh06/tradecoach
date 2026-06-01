import { StyleSheet, View } from 'react-native';

import { colors, radius } from '../utils/theme';

interface Props {
  points: number[];
  width?: number;
  height?: number;
  tone?: 'success' | 'danger' | 'neutral';
}

/**
 * Bar-style sparkline using plain Views. Renders a series of small bars
 * baselined at the midpoint so up/down moves read visually. Works on
 * native + web without an SVG dependency.
 */
export const Sparkline = ({
  points,
  width = 92,
  height = 28,
  tone = 'neutral',
}: Props) => {
  const safe = points.length ? points : [0];
  const max = Math.max(...safe.map((p) => Math.abs(p)), 1);
  const color =
    tone === 'success'
      ? colors.success
      : tone === 'danger'
        ? colors.danger
        : colors.primary;
  const barWidth = Math.max(2, Math.floor(width / Math.max(safe.length, 1)) - 2);
  const half = height / 2;

  return (
    <View
      style={[
        styles.wrap,
        { width, height, gap: 2 },
      ]}
    >
      {safe.map((p, i) => {
        const h = Math.max(2, (Math.abs(p) / max) * half);
        const positive = p >= 0;
        return (
          <View
            key={i}
            style={[
              styles.barBox,
              { height, width: barWidth },
            ]}
          >
            <View
              style={[
                styles.bar,
                {
                  height: h,
                  width: barWidth,
                  backgroundColor: positive ? color : colors.danger,
                  opacity: 0.85,
                  marginTop: positive ? half - h : half,
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  barBox: {
    justifyContent: 'flex-start',
  },
  bar: { borderRadius: radius.xs },
});

export default Sparkline;
