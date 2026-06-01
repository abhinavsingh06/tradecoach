import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '../utils/theme';

interface Props {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'danger' | 'accent';
  hint?: string;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

const toneColor = (tone: Props['tone']) => {
  switch (tone) {
    case 'success':
      return colors.success;
    case 'danger':
      return colors.danger;
    case 'accent':
      return colors.accent;
    default:
      return colors.text;
  }
};

export const StatTile = ({
  label,
  value,
  tone = 'default',
  hint,
  style,
  compact,
}: Props) => (
  <View style={[styles.tile, compact && styles.compact, style]}>
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.value, { color: toneColor(tone) }, compact && styles.valueCompact]}>
      {value}
    </Text>
    {hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    minHeight: 96,
    justifyContent: 'center',
  },
  compact: { minHeight: 72, padding: spacing.md },
  label: {
    ...typography.caption,
    color: colors.textDim,
    textTransform: 'uppercase',
  },
  value: {
    ...typography.h1,
    marginTop: spacing.xs,
  },
  valueCompact: { ...typography.h2, marginTop: 2 },
  hint: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});

export default StatTile;
