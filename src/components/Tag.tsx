import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '../utils/theme';

type Tone = 'default' | 'success' | 'danger' | 'warning' | 'accent' | 'primary';

interface Props {
  label: string;
  tone?: Tone;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const palette = (tone: Tone) => {
  switch (tone) {
    case 'success':
      return { bg: colors.successDim, fg: colors.success };
    case 'danger':
      return { bg: colors.dangerDim, fg: colors.danger };
    case 'warning':
      return { bg: colors.warningDim, fg: colors.warning };
    case 'accent':
      return { bg: colors.accentSoft, fg: colors.accent };
    case 'primary':
      return { bg: colors.primarySoft, fg: colors.primary };
    default:
      return { bg: colors.surfaceAlt, fg: colors.textDim };
  }
};

export const Tag = ({ label, tone = 'default', icon, style }: Props) => {
  const { bg, fg } = palette(tone);
  return (
    <View style={[styles.tag, { backgroundColor: bg }, style]}>
      {icon ? <View style={{ marginRight: spacing.xs }}>{icon}</View> : null}
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  label: { ...typography.caption, textTransform: 'uppercase', letterSpacing: 0.6 },
});

export default Tag;
