import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, ViewProps } from 'react-native';

import { colors, gradients, radius, shadows, spacing } from '../utils/theme';

type GradientName = keyof typeof gradients;

interface Props extends ViewProps {
  gradient?: GradientName;
  variant?: 'flat' | 'gradient';
  glow?: boolean;
  padded?: boolean;
}

export const GradientCard = ({
  gradient = 'card',
  variant = 'gradient',
  glow = false,
  padded = true,
  style,
  children,
  ...rest
}: Props) => {
  const content = (
    <View
      style={[
        styles.body,
        padded && styles.padded,
        glow && shadows.glow,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );

  if (variant === 'flat') {
    return (
      <View
        style={[styles.flat, padded && styles.padded, glow && shadows.glow, style]}
        {...rest}
      >
        {children}
      </View>
    );
  }

  const stops = gradients[gradient];
  return (
    <LinearGradient
      colors={[...stops] as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrapper, glow && shadows.glow]}
    >
      {content}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  body: {
    backgroundColor: 'transparent',
  },
  flat: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  padded: {
    padding: spacing.lg,
  },
});

export default GradientCard;
