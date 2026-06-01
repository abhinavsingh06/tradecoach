// Theme tokens. The app uses a deep-space dark palette with electric
// gradients to feel premium and modern. All colours stay AA-readable on
// `colors.bg`.

export const colors = {
  // Base surfaces
  bg: '#070A17',
  bgElevated: '#0D1224',
  surface: '#121A2E',
  surfaceAlt: '#1A2440',
  surfaceMuted: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',

  // Text
  text: '#F4F6FB',
  textDim: '#9BA8C7',
  textMuted: '#5F6E92',

  // Brand
  primary: '#6E8BFF',
  primaryDeep: '#3A5BE0',
  primarySoft: 'rgba(110,139,255,0.16)',
  accent: '#B794FF',
  accentSoft: 'rgba(183,148,255,0.18)',

  // Semantic
  success: '#34D399',
  successDim: 'rgba(52,211,153,0.16)',
  danger: '#F87171',
  dangerDim: 'rgba(248,113,113,0.18)',
  warning: '#FBBF24',
  warningDim: 'rgba(251,191,36,0.18)',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(4,7,18,0.72)',
};

// Reusable gradient stops. Always specify both colors *and* a direction
// when passing to LinearGradient.
export const gradients = {
  hero: ['#5B8DEF', '#7C5CFF', '#B794FF'] as const,
  heroSoft: ['rgba(91,141,239,0.85)', 'rgba(124,92,255,0.85)'] as const,
  card: ['#1B2340', '#0E1428'] as const,
  win: ['#10B981', '#34D399'] as const,
  loss: ['#DC2626', '#F87171'] as const,
  neutral: ['#1F2A4A', '#13182C'] as const,
  glow: ['rgba(124,92,255,0.32)', 'rgba(124,92,255,0)'] as const,
  midnight: ['#070A17', '#0E1428', '#1A1B40'] as const,
  candlestick: ['#08122C', '#0A0E20'] as const,
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const typography = {
  hero: { fontSize: 44, fontWeight: '800' as const, letterSpacing: -1.2 },
  display: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.6 },
  h1: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  h2: { fontSize: 19, fontWeight: '700' as const, letterSpacing: -0.2 },
  h3: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyBold: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.4 },
  small: { fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.3 },
  mono: {
    fontSize: 14,
    fontWeight: '600' as const,
    fontVariant: ['tabular-nums'] as const,
  },
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  glow: {
    shadowColor: '#7C5CFF',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.45,
    shadowRadius: 30,
    elevation: 12,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
};

export const motion = {
  fast: 180,
  base: 260,
  slow: 420,
  easing: 'ease-in-out' as const,
};

export const theme = {
  colors,
  gradients,
  spacing,
  radius,
  typography,
  shadows,
  motion,
};
export default theme;
