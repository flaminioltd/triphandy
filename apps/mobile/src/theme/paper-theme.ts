import { MD3LightTheme, configureFonts } from 'react-native-paper';
import { tokens } from './tokens';

const fontConfig = {
  displayLarge: { fontFamily: 'DMSans_400Regular', fontSize: 28, letterSpacing: -0.5, lineHeight: 36 },
  displayMedium: { fontFamily: 'DMSans_400Regular', fontSize: 24, letterSpacing: -0.3, lineHeight: 32 },
  displaySmall: { fontFamily: 'DMSans_400Regular', fontSize: 20, letterSpacing: 0, lineHeight: 28 },
  headlineLarge: { fontFamily: 'DMSans_400Regular', fontSize: 28, letterSpacing: -0.5, lineHeight: 36 },
  headlineMedium: { fontFamily: 'DMSans_400Regular', fontSize: 24, letterSpacing: -0.3, lineHeight: 32 },
  headlineSmall: { fontFamily: 'DMSans_400Regular', fontSize: 20, letterSpacing: 0, lineHeight: 28 },
  titleLarge: { fontFamily: 'DMSans_400Regular', fontSize: 20, letterSpacing: 0, lineHeight: 28 },
  titleMedium: { fontFamily: 'DMSans_400Regular', fontSize: 18, letterSpacing: 0, lineHeight: 24 },
  titleSmall: { fontFamily: 'DMSans_400Regular', fontSize: 16, letterSpacing: 0, lineHeight: 24 },
  labelLarge: { fontFamily: 'DMSans_400Regular', fontSize: 12, letterSpacing: 0.5, lineHeight: 16 },
  labelMedium: { fontFamily: 'DMSans_400Regular', fontSize: 12, letterSpacing: 0.5, lineHeight: 16 },
  labelSmall: { fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 0.5, lineHeight: 14 },
  bodyLarge: { fontFamily: 'DMSans_400Regular', fontSize: 16, letterSpacing: 0, lineHeight: 24 },
  bodyMedium: { fontFamily: 'DMSans_400Regular', fontSize: 14, letterSpacing: 0, lineHeight: 20 },
  bodySmall: { fontFamily: 'DMSans_400Regular', fontSize: 12, letterSpacing: 0, lineHeight: 16 },
};

export const theme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    background: tokens.colors.ui.appBackground,
    surface: tokens.colors.ui.screenSurface,
    surfaceVariant: '#F0F0F0',
    primary: tokens.colors.ui.primaryPurple,
    primaryContainer: tokens.colors.ui.primaryPurpleSoft,
    secondary: tokens.colors.ui.warmSand,
    secondaryContainer: tokens.colors.ui.primaryPurpleSoft,
    onSecondaryContainer: tokens.colors.ui.primaryPurple,
    tertiary: tokens.colors.ui.warmSandLight,
    tertiaryContainer: tokens.colors.ui.warmSandLight,
    outline: tokens.colors.ui.warmBorder,
    outlineVariant: tokens.colors.ui.warmBorder,
    error: tokens.colors.ui.dangerCoral,
    errorContainer: tokens.colors.ui.dangerCoral,
    onSurface: tokens.colors.ui.textPrimary,
    onSurfaceVariant: tokens.colors.ui.textSecondary,
    onPrimaryContainer: tokens.colors.ui.primaryPurple,
  },
  roundness: 3, 
};


