import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { colors, gradients, radius, spacing, typography } from '../utils/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gradient';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Button = ({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  fullWidth,
  leftIcon,
  rightIcon,
  size = 'md',
}: Props) => {
  const isDisabled = disabled || loading;

  const inner = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <>
          {leftIcon}
          <Text style={[styles.label, variant === 'ghost' && styles.ghostLabel, sizeText[size]]}>
            {label}
          </Text>
          {rightIcon}
        </>
      )}
    </View>
  );

  if (variant === 'gradient') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.base,
          fullWidth && styles.fullWidth,
          { overflow: 'hidden', padding: 0 },
          isDisabled && styles.disabled,
          pressed && !isDisabled && styles.pressed,
          sizePad[size],
          style,
        ]}
      >
        <LinearGradient
          colors={gradients.hero as unknown as [string, string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientFill, sizePad[size]]}
        >
          {inner}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        sizePad[size],
        style,
      ]}
    >
      {inner}
    </Pressable>
  );
};

const sizePad = {
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, minHeight: 36 },
  md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, minHeight: 48 },
  lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, minHeight: 56 },
} as const;

const sizeText = {
  sm: { fontSize: 13 },
  md: { fontSize: 15 },
  lg: { fontSize: 17 },
} as const;

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  primary: { backgroundColor: colors.primary },
  secondary: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.danger },
  gradientFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  label: { color: colors.white, ...typography.bodyBold },
  ghostLabel: { color: colors.primary },
});

export default Button;
