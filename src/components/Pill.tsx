import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, typography } from '../utils/theme';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'default' | 'success' | 'danger' | 'warning' | 'primary' | 'accent';
}

const toneColor = (tone: Props['tone']) => {
  switch (tone) {
    case 'success':
      return colors.success;
    case 'danger':
      return colors.danger;
    case 'warning':
      return colors.warning;
    case 'accent':
      return colors.accent;
    case 'primary':
      return colors.primary;
    default:
      return colors.primary;
  }
};

export const Pill = ({ label, selected, onPress, tone = 'default' }: Props) => {
  const c = toneColor(tone);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        selected && {
          backgroundColor: c,
          borderColor: c,
          shadowColor: c,
          shadowOpacity: 0.35,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
        },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.75 },
  label: {
    ...typography.caption,
    color: colors.textDim,
    textTransform: 'capitalize',
  },
  labelSelected: { color: colors.white, fontWeight: '700' },
});

export default Pill;
