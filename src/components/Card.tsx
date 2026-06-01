import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radius, shadows, spacing } from '../utils/theme';

interface Props extends ViewProps {
  padded?: boolean;
  elevated?: boolean;
}

export const Card = ({
  style,
  children,
  padded = true,
  elevated = true,
  ...rest
}: Props) => (
  <View
    style={[
      styles.card,
      padded && styles.padded,
      elevated && shadows.subtle,
      style,
    ]}
    {...rest}
  >
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  padded: { padding: spacing.lg },
});

export default Card;
