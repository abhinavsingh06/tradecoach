import { useRef, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

interface Props extends Omit<PressableProps, 'style' | 'children'> {
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
  children?: ReactNode;
}

/**
 * A pressable that springs to `scaleTo` on press-in and back on press-out.
 * Apple-grade tactile feedback for cards, list rows, and large CTAs.
 */
export const PressableScale = ({
  scaleTo = 0.97,
  style,
  children,
  onPressIn,
  onPressOut,
  haptic,
  ...rest
}: Props) => {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (to: number) => {
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 22,
      bounciness: 8,
    }).start();
  };

  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        animate(scaleTo);
        if (haptic) {
          // Lazy require so web/non-haptic builds don't crash.
          import('expo-haptics')
            .then((h) => h.impactAsync(h.ImpactFeedbackStyle.Light))
            .catch(() => undefined);
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animate(1);
        onPressOut?.(e);
      }}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default PressableScale;

// Suppress unused import warning in some bundlers.
void Easing;
