// Consistent 8px Grid Spacing System
// Use these values throughout the app for consistent spacing

export const Spacing = {
  // Base unit: 8px
  xs: 4,    // 0.5x - Extra small spacing
  sm: 8,    // 1x - Small spacing
  md: 16,   // 2x - Medium spacing (default)
  lg: 24,   // 3x - Large spacing
  xl: 32,   // 4x - Extra large spacing
  xxl: 48,  // 6x - Extra extra large spacing
  
  // Specific use cases
  cardPadding: 16,
  cardMargin: 12,
  screenPadding: 20,
  buttonPadding: 14,
  inputPadding: 16,
  sectionSpacing: 24,
  
  // Border radius
  radiusSmall: 8,
  radiusMedium: 12,
  radiusLarge: 16,
  radiusXLarge: 20,
  radiusFull: 9999,
};

// Typography scale
export const Typography = {
  // Font sizes
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  
  // Font weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
  
  // Line heights
  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.75,
};

// Shadow presets
export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
};
