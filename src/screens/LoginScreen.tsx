import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthProvider';
import {
  colors,
  gradients,
  radius,
  shadows,
  spacing,
  typography,
} from '../utils/theme';

const VALUE_PROPS = [
  {
    icon: 'flash-outline' as const,
    title: 'Trades sync from Kite',
    desc: 'Zero manual logging — every fill auto-pairs into round trips.',
  },
  {
    icon: 'sparkles-outline' as const,
    title: 'AI drafts your journal',
    desc: 'AI proposes emotion, setup, and notes. You just accept or edit.',
  },
  {
    icon: 'pulse-outline' as const,
    title: 'Catch tilt in real time',
    desc: 'Overtrading meter + revenge-trade warning before you blow the day.',
  },
  {
    icon: 'analytics-outline' as const,
    title: 'Weekly pattern report',
    desc: 'See which setups print and which emotions cost you ₹ — every Sunday.',
  },
];

export const LoginScreen = () => {
  const { signInWithKite, error } = useAuth();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [propIdx, setPropIdx] = useState(0);
  const { width } = useWindowDimensions();

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;
  const orbA = useRef(new Animated.Value(0)).current;
  const orbB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const loop = (val: Animated.Value, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: 1,
            duration: dur,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: dur,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    loop(orbA, 6000);
    loop(orbB, 8000);
  }, [fade, slide, orbA, orbB]);

  useEffect(() => {
    const id = setInterval(() => {
      setPropIdx((i) => (i + 1) % VALUE_PROPS.length);
    }, 3800);
    return () => clearInterval(id);
  }, []);

  const onConnect = async () => {
    setBusy(true);
    setLocalError(null);
    try {
      await signInWithKite();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const displayError = localError ?? error;

  const orbATranslate = orbA.interpolate({
    inputRange: [0, 1],
    outputRange: [-30, 30],
  });
  const orbBTranslate = orbB.interpolate({
    inputRange: [0, 1],
    outputRange: [24, -24],
  });

  const heroDiameter = useMemo(
    () => Math.min(180, Math.round(width * 0.42)),
    [width],
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={gradients.midnight as unknown as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating gradient orbs */}
      <Animated.View
        style={[
          styles.orb,
          {
            top: -60,
            right: -40,
            backgroundColor: 'rgba(124,92,255,0.32)',
            transform: [{ translateY: orbATranslate }],
            pointerEvents: 'none',
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          {
            bottom: 80,
            left: -60,
            backgroundColor: 'rgba(110,139,255,0.28)',
            transform: [{ translateY: orbBTranslate }],
            pointerEvents: 'none',
          },
        ]}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              opacity: fade,
              transform: [{ translateY: slide }],
              alignItems: 'center',
            }}
          >
            <View style={styles.brandRow}>
              <View style={styles.logoMark}>
                <LinearGradient
                  colors={gradients.hero as unknown as [string, string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons name="trending-up" size={22} color={colors.white} />
              </View>
              <Text style={styles.brandText}>TradeCoach</Text>
            </View>

            <View
              style={[
                styles.heroOrb,
                {
                  width: heroDiameter,
                  height: heroDiameter,
                  borderRadius: heroDiameter / 2,
                  marginTop: spacing.xl,
                },
              ]}
            >
              <LinearGradient
                colors={gradients.hero as unknown as [string, string, string]}
                start={{ x: 0.1, y: 0.1 }}
                end={{ x: 0.9, y: 0.9 }}
                style={[
                  StyleSheet.absoluteFill,
                  { borderRadius: heroDiameter / 2 },
                ]}
              />
              <View style={styles.heroOrbGlow} />
              <Ionicons name="sparkles" size={48} color={colors.white} />
            </View>

            <Text style={styles.title}>The trader’s mirror.</Text>
            <Text style={styles.subtitle}>
              Sync Kite. Tag emotion. Get coached.{'\n'}
              Built for Indian retail traders who want an edge.
            </Text>

            <View style={styles.propsCarousel}>
              <PropCard key={propIdx} prop={VALUE_PROPS[propIdx]!} />
              <View style={styles.dots}>
                {VALUE_PROPS.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === propIdx && {
                        backgroundColor: colors.accent,
                        width: 18,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>

            <Pressable
              onPress={onConnect}
              disabled={busy}
              style={({ pressed }) => [
                styles.ctaWrap,
                pressed && !busy && { opacity: 0.92, transform: [{ scale: 0.98 }] },
                busy && { opacity: 0.7 },
              ]}
            >
              <LinearGradient
                colors={gradients.hero as unknown as [string, string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cta}
              >
                {busy ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={18} color={colors.white} />
                    <Text style={styles.ctaText}>Connect with Zerodha Kite</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={colors.white}
                    />
                  </>
                )}
              </LinearGradient>
            </Pressable>

            {displayError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={14} color={colors.danger} />
                <Text style={styles.errorText}>{displayError}</Text>
              </View>
            ) : null}

            <View style={styles.trustRow}>
              <TrustItem icon="shield-checkmark" label="OAuth via Kite" />
              <TrustItem icon="time-outline" label="6 AM IST refresh" />
              <TrustItem icon="server-outline" label="No keys stored" />
            </View>

            <Text style={styles.fineprint}>
              We never see your Kite password. Your access token lives on our
              server and expires daily, like Zerodha intended.
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const PropCard = ({
  prop,
}: {
  prop: (typeof VALUE_PROPS)[number];
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translate, {
        toValue: 0,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translate]);

  return (
    <Animated.View
      style={[
        styles.propCard,
        { opacity, transform: [{ translateY: translate }] },
      ]}
    >
      <View style={styles.propIcon}>
        <Ionicons name={prop.icon} size={22} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.propTitle}>{prop.title}</Text>
        <Text style={styles.propDesc}>{prop.desc}</Text>
      </View>
    </Animated.View>
  );
};

const TrustItem = ({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) => (
  <View style={styles.trustItem}>
    <Ionicons name={icon} size={14} color={colors.textDim} />
    <Text style={styles.trustText}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  orb: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 999,
    ...(Platform.OS === 'web' ? { filter: 'blur(60px)' as unknown as undefined } : null),
    opacity: 0.85,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoMark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },

  heroOrb: {
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
  },
  heroOrbGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  title: {
    ...typography.hero,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  subtitle: {
    ...typography.body,
    color: colors.textDim,
    textAlign: 'center',
    marginTop: spacing.md,
    maxWidth: 360,
    lineHeight: 22,
  },

  propsCarousel: {
    width: '100%',
    maxWidth: 460,
    marginTop: spacing.xxl,
  },
  propCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    ...shadows.subtle,
  },
  propIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propTitle: { ...typography.h3, color: colors.text },
  propDesc: {
    ...typography.body,
    color: colors.textDim,
    marginTop: 4,
    fontSize: 13,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  ctaWrap: {
    marginTop: spacing.xl,
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.glow,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  ctaText: { ...typography.h3, color: colors.white },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.dangerDim,
    maxWidth: 380,
  },
  errorText: { ...typography.caption, color: colors.danger, flex: 1 },

  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  trustText: { ...typography.caption, color: colors.textDim },
  fineprint: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    maxWidth: 360,
    lineHeight: 16,
  },
});

export default LoginScreen;
