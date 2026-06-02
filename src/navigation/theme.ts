import { DarkTheme, type Theme } from '@react-navigation/native';

import { colors } from '../utils/theme';

/** React Navigation theme that adopts our dark colour palette. */
export const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    border: colors.border,
    primary: colors.primary,
    text: colors.text,
  },
};
