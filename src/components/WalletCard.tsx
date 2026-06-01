import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { PressableScale } from './PressableScale';
import { spacing } from '../utils/theme';

interface Props {
  /** Two-stop background gradient — the "skin" of the card. */
  skin: readonly [string, string];
  /**
   * Optional diagonal accent wash that sits on top of the skin. Gives the
   * card depth (subtle color shift across the surface) without making it
   * busy. Pass three stops; outer two should be transparent.
   */
  accent?: readonly [string, string, string];
  /** Inner padding applied to children. Set false to render edge-to-edge. */
  padded?: boolean;
  /** Tap handler. If provided the card uses PressableScale for tactile feel. */
  onPress?: () => void;
  /** Outer radius. Apple Wallet sits around 18–20. */
  radius?: number;
  /** Stronger shadow (use sparingly for the most important card). */
  elevated?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Apple-Wallet style card primitive. Three layers, in order, give it real
 * physicality:
 *   1. Soft drop shadow (the card sits ABOVE the page)
 *   2. Gradient skin (the card has color identity, not flat)
 *   3. Diagonal accent wash (subtle depth — light gathers on one corner)
 *   4. Hairline top highlight + bottom shadow (the "edge" of a real card)
 *
 * Each piece is small on its own. Stacked, they read as a physical object
 * rather than "a rectangle with a border".
 */
export const WalletCard = ({
  skin,
  accent,
  padded = true,
  onPress,
  radius = 22,
  elevated = false,
  children,
  style,
}: Props) => {
  // React Native shadow props don't always translate cleanly to react-native-web.
  // Supply an explicit CSS boxShadow on web so the card visibly LIFTS off the
  // background — without it, dark cards on a dark canvas read as flat /
  // "clipped" rectangles with no perceivable edge.
  const webShadow: ViewStyle =
    Platform.OS === 'web'
      ? ({
          boxShadow: elevated
            ? '0 18px 36px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.35)'
            : '0 12px 28px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.30)',
        } as unknown as ViewStyle)
      : {};

  const inner = (
    <View
      style={[
        styles.shell,
        elevated ? styles.shadowLg : styles.shadowMd,
        webShadow,
        { borderRadius: radius },
        style,
      ]}
    >
      <LinearGradient
        colors={skin}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      {accent ? (
        <LinearGradient
          colors={accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
          pointerEvents="none"
        />
      ) : null}
      <View
        pointerEvents="none"
        style={[
          styles.edge,
          {
            borderRadius: radius,
            // Brighter top highlight + slightly stronger side edges so the
            // card's "lip" reads clearly against the dark canvas. Without
            // this the top edge disappears and the card looks clipped.
            borderTopColor: 'rgba(255,255,255,0.18)',
            borderLeftColor: 'rgba(255,255,255,0.08)',
            borderRightColor: 'rgba(255,255,255,0.08)',
            borderBottomColor: 'rgba(0,0,0,0.32)',
          },
        ]}
      />
      <View style={padded && styles.padded}>{children}</View>
    </View>
  );

  if (!onPress) return inner;

  return (
    <PressableScale onPress={onPress} scaleTo={0.985} haptic>
      {inner}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    backgroundColor: '#0E1226',
  },
  edge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
  },
  // Generous inner padding so content never feels cramped against the
  // rounded edge. Vertical padding is a touch larger than horizontal,
  // which gives cards a more "balanced" / wallet-like proportion.
  padded: {
    paddingHorizontal: spacing.lg + 4,
    paddingVertical: spacing.lg + 6,
  },
  // Native shadow (RN). Web uses boxShadow above.
  shadowMd: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.42,
    shadowRadius: 20,
    elevation: 8,
  },
  shadowLg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 14,
  },
});

// --- Pre-baked skins so screens stay consistent. -----------------------------

export const skins = {
  /** Today / recent / stats — the "trading data" identity. */
  navy: ['#171C36', '#0C1126'] as const,
  /** Plan / tonight / coach — "intent / reflection". */
  violet: ['#241941', '#160E2C'] as const,
  /** Smart-action variants. */
  accent: ['#27185A', '#160E33'] as const,
  warning: ['#3A270C', '#251907'] as const,
  danger: ['#3B1320', '#240D17'] as const,
} as const;

/** Diagonal accent washes — sit on top of a skin to add subtle color. */
export const accents = {
  success: [
    'rgba(52,211,153,0.00)',
    'rgba(52,211,153,0.10)',
    'rgba(52,211,153,0.00)',
  ] as const,
  danger: [
    'rgba(248,113,113,0.00)',
    'rgba(248,113,113,0.12)',
    'rgba(248,113,113,0.00)',
  ] as const,
  accent: [
    'rgba(183,148,255,0.00)',
    'rgba(183,148,255,0.10)',
    'rgba(183,148,255,0.00)',
  ] as const,
  warning: [
    'rgba(251,191,36,0.00)',
    'rgba(251,191,36,0.10)',
    'rgba(251,191,36,0.00)',
  ] as const,
  neutral: [
    'rgba(255,255,255,0.00)',
    'rgba(255,255,255,0.04)',
    'rgba(255,255,255,0.00)',
  ] as const,
} as const;

export default WalletCard;
