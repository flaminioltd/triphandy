export const tokens = {
  colors: {
    // Keep existing brand colors just in case they are used elsewhere, but add uiColors
    brand: {
      primary: '#9BB3E0', // Blue
      secondary: '#F4E9A0', // Yellow
      tertiary: '#A8C999', // Green
      quaternary: '#D9A391', // Coral
      quinary: '#E8C4B8', // Pink
    },
    ui: {
      // Base
      appBackground: '#FFFDFC',
      screenSurface: '#FFFFFF',
      headerSurface: '#EAF7E5',
      
      // Text
      textPrimary: '#161313',
      textSecondary: '#5F5853',
      textMuted: '#8E8781',
      textDisabled: '#B7B0AA',
      
      // Brand / hierarchy
      primaryPurple: '#5B3FA3',
      primaryPurpleSoft: '#EEE9FA',
      primaryPurpleFaded: 'rgba(91, 63, 163, 0.08)',
      premiumPurple: '#8A61FF',
      premiumPurpleSoft: 'rgba(138, 97, 255, 0.1)',
      
      // Warm surfaces
      warmSand: '#EFE7DC',
      warmSandLight: '#F7F1EA',
      warmBorder: '#E5DED7',
      
      // Selected / active
      selectedPurple: '#D8C2F2',
      selectedPurpleStrong: '#C1A3F5',
      selectedText: '#3F2E7E',
      
      // Feedback
      successSage: '#91C788',
      warningGold: '#E6B84D',
      dangerCoral: '#D86666',
      infoBlue: '#9CC7E8',
      
      // Progress
      progressTrack: '#DDD6CF',
      progressFill: '#2B145F',
    },
    surface: {
      canvas: '#E8D5C4',
      card: '#FFFFFF',
      subtle: '#F5F0EB',
    },
    text: {
      primary: '#1A1A1A',
      secondary: '#787878',
      tertiary: '#A8A8A8',
      disabled: '#D4D4D4',
    },
    border: {
      default: '#F0F0F0',
    },
    state: {
      warning: '#F59E0B',
      warningSoft: '#FFF6E6',
      error: '#D64545',
      errorSoft: '#FDECEC',
      locked: '#7C6CF2',
      lockedSoft: '#F1EEFF',
    }
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  }
};


