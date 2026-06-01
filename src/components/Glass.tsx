import { BlurView, type BlurTint } from 'expo-blur';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius, shadows, spacing } from '../utils/theme';

interface Props {
  children?: React.ReactNode;
  /** Blur intensity 0..100. Native uses platform vibrancy; web uses CSS backdrop-filter. */
  intensity?: number;
  tint?: BlurTint;
  /** Extra translucent overlay on top of the blur — controls the "tinted glass" feel. */
  overlay?: string;
  borderColor?: string;
  rounded?: keyof typeof radius;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  highlight?: boolean;
}

/**
 * Apple-style frosted glass. Uses `expo-blur` for true backdrop blur on iOS
 * (vibrancy/material) and gaussian on web/Android. On Android the BlurView is
 * approximated but still gives a proper translucent feel.
 *
 * The hairline outline + subtle top highlight is what separates real glass
 * from "just dark surface with opacity". Both are deliberate.
 */
export const Glass = ({
  children,
  intensity = 38,
  tint = 'dark',
  overlay = 'rgba(15, 22, 44, 0.42)',
  borderColor = 'rgba(255,255,255,0.10)',
  rounded = 'lg',
  padded = true,
  style,
  highlight = true,
}: Props) => {
  const r = radius[rounded];

  // On web, BlurView mounts a div with backdrop-filter; on iOS/Android it's a
  // native view. Either way we wrap it in our shape so the outline and shadow
  // render correctly.
  return (
    <View
      style={[
        styles.shell,
        {
          borderRadius: r,
          borderColor,
        },
        style,
      ]}
    >
      <BlurView
        intensity={intensity}
        tint={tint}
        // Web: BlurView renders backdrop-filter when supported.
        style={[StyleSheet.absoluteFill, { borderRadius: r }]}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: overlay, borderRadius: r },
        ]}
      />
      {highlight ? (
        <View
          pointerEvents="none"
          style={[
            styles.highlight,
            { borderRadius: r, borderColor: 'rgba(255,255,255,0.10)' },
          ]}
        />
      ) : null}
      <View style={[padded && styles.padded]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.02)',
    ...shadows.subtle,
  },
  padded: { padding: spacing.lg },
  // Inner border to create a faint Apple-style top edge highlight.
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.05)',
    borderRightColor: 'rgba(255,255,255,0.05)',
    borderBottomColor: 'rgba(0,0,0,0.30)',
  },
});

export default Glass;

/**
 * Decorative gradient orbs that sit behind glass so the frost has color to
 * refract. Render this *under* your content (e.g. between the page background
 * gradient and the first Glass card). Each orb is a giant blurred circle with
 * a slow opacity loop.
 */
export const AmbientOrbs = ({
  variant = 'cool',
}: {
  variant?: 'cool' | 'warm' | 'mixed';
}) => {
  const orbs = ORBS[variant];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {orbs.map((o, i) => (
        <View
          key={i}
          style={[
            orbStyles.orb,
            {
              top: o.top as number | undefined,
              left: o.left as number | undefined,
              right: o.right as number | undefined,
              bottom: o.bottom as number | undefined,
              width: o.size,
              height: o.size,
              backgroundColor: o.color,
              opacity: o.opacity,
              ...(Platform.OS === 'web'
                ? ({ filter: `blur(${o.blur}px)` } as unknown as ViewStyle)
                : null),
            },
          ]}
        />
      ))}
    </View>
  );
};

interface Orb {
  size: number;
  top?: number | string;
  left?: number | string;
  right?: number | string;
  bottom?: number | string;
  color: string;
  opacity: number;
  blur: number;
}

// One diffuse orb per variant. The point is to give the glass *something*
// to refract, not to ship a lava lamp. Restraint reads as confidence.
const ORBS: Record<'cool' | 'warm' | 'mixed', Orb[]> = {
  cool: [
    { size: 520, top: -200, right: -160, color: 'rgba(110,139,255,0.16)', opacity: 1, blur: 140 },
  ],
  warm: [
    { size: 520, top: -200, left: -160, color: 'rgba(248,113,113,0.14)', opacity: 1, blur: 140 },
  ],
  mixed: [
    { size: 560, top: -200, right: -180, color: 'rgba(124,92,255,0.14)', opacity: 1, blur: 150 },
  ],
};

const orbStyles = StyleSheet.create({
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
});

// Re-export tokens unused warning suppressor (avoids dead-import lint).
void colors;
