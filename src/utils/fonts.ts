import { Platform, type TextStyle } from 'react-native';

// Platform-aware serif. Uses system fonts so we ship nothing extra:
//   iOS: Georgia (always available, beautiful italic)
//   Android: serif (Roboto Slab or Noto Serif depending on device)
//   Web: a small stack ending in serif
export const serifItalic: TextStyle = Platform.select({
  ios: { fontFamily: 'Georgia', fontStyle: 'italic' },
  android: { fontFamily: 'serif', fontStyle: 'italic' },
  default: {
    fontFamily:
      'Georgia, "New York", "Iowan Old Style", "Times New Roman", serif',
    fontStyle: 'italic',
  },
}) as TextStyle;

export const serif: TextStyle = Platform.select({
  ios: { fontFamily: 'Georgia' },
  android: { fontFamily: 'serif' },
  default: { fontFamily: 'Georgia, "New York", "Times New Roman", serif' },
}) as TextStyle;
