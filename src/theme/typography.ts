import { Platform } from 'react-native';

// Use system fonts that reliably support Indian scripts
const base = Platform.OS === 'ios' ? 'System' : 'sans-serif';
const bold = Platform.OS === 'ios' ? 'System' : 'sans-serif-medium';

export const typography = {
  displayLarge:  { fontSize: 30, fontWeight: '800' as const, lineHeight: 38 },
  displayMedium: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
  headingLarge:  { fontSize: 22, fontWeight: '700' as const, lineHeight: 30 },
  headingMedium: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26 },
  headingSmall:  { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
  bodyLarge:     { fontSize: 18, fontWeight: '400' as const, lineHeight: 28 },
  bodyMedium:    { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodySmall:     { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  labelLarge:    { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
  labelMedium:   { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  caption:       { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  tiny:          { fontSize: 11, fontWeight: '500' as const, lineHeight: 16 },
};
